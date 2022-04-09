const config = require('./config.json');
const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');


// User ID
const USER = (
  process.env.FREERICE_UID ||
  process.env.FREERICE_USER ||
  process.env.FREERICE_USERID ||
  process.env.FREERICE_USER_ID ||
  process.env.FREERICE ||
  config.default_user
);


// Answer URL
let answer_url = '';


let current_question = null;
let initial_level = 1;


let last_req_status = 0;


const column_size = config.column_size || 12;


let start_rice = 0;
const start_time = new Date();


let highest_speed = 0;
let highest_rps = 0;

try {
  const data = JSON.parse(fs.readFileSync('highest_speed.txt', 'ascii')) || [0, 0];

  highest_speed = data[0];
  highest_rps = data[1];
} catch (err) {
  
}


class Question
{
  constructor (id, q)
  {
    this.id = id;
    this.q = q;
  }

  static fromJson(data)
  {
    return new this(
      data.data.attributes.question_id,
      data.data.attributes.question.text
    );
  }

  solve()
  {
    const spl = this.q.split('x').map(n => parseInt(n.trim()));

    return spl[0] * spl[1];
  }
}


async function newGame(level=initial_level)
{
  let resp;
  try {
    resp = await axios.post('https://engine.freerice.com/games?lang=en', {
      user: USER,
      category: config.category,
      level
    }, {
      headers: config.default_headers,
      timeout: config.http_timeout
    });
  } catch (err) {
    writeResp(err);

    if (err.response)
      last_req_status = err.response.status;

    throw err;
  }

  last_req_status = resp.status;

  answer_url = resp.data.data.links.self + '/answer?lang=en';

  current_question = Question.fromJson(resp.data);

  return level;
}

async function submitQuestion(q, a)
{
  let resp;
  try {
    resp = await axios.patch(answer_url, {
      answer: 'a' + a,
      question: q.id,
      user: USER
    }, {
      headers: config.default_headers,
      timeout: config.http_timeout
    });
  } catch (err) {
    writeResp(err);

    last_req_status = err.response.status;

    throw err;
  }

  last_req_status = resp.status;

  current_question = Question.fromJson(resp.data);

  try {
    return resp.data.data.attributes.userattributes.rice;
  } catch (err) {
    return resp.data.data.attributes.user_rice_total;
  }
}

async function getProfile(user=USER)
{
  if (!config.fetch_profiles)
    return;

  let resp;

  try {
    resp = await axios.get(`https://accounts.freerice.com/public/users?uuids=${user}`, {
      headers: config.default_headers,
      timeout: config.http_timeout
    });
  } catch (err) {
    writeResp(err);

    last_req_status = err.response.status;

    throw err;
  }

  last_req_status = resp.status;

  return resp.data[user];
}

function checkBlocked()
{
  if (last_req_status == 429)
  {
    if (config.kill)
    {
      console.log('Blocked, killing\n');
      execSync(config.kill_cmd);
    }
    else
      console.log('Blocked');

    process.exit(config.EXIT_BLOCKED);
  }
}

function writeResp(a)
{
  let data = null;

  if (a && a.response && a.response.data)
    data = a.response.data;
  else if (a && a.data)
    data = a.data;

  if (data)
    fs.writeFileSync(
      'last_resp_data.json',
      JSON.stringify(
        a.response.data
      )
    );
}

function highestSpeed(speed, rps)
{
  if (speed > highest_speed)
  {
    highest_speed = speed;
    highest_rps = rps;

    if (config.log_highest_speed)
      fs.writeFile('highest_speed.txt', JSON.stringify([
        highest_speed,
        highest_rps
      ]), 'ascii', err => 0);
  }
}


getProfile()
.then(PROFILE => {
  if (PROFILE)
    console.log('User:', PROFILE.name);

  console.log('Threads:', config.threads);
  console.log('Kill:', config.kill);
  console.log('Verbose:', config.verbose, '\n');
  
  process.stdout.write('Rice'.padEnd(column_size));
  process.stdout.write('Speed');

  process.stdout.write('\n');
  
  // Bot code
  for (let i = 0; i < config.threads; i++)
    newGame()
    .then(async level => {
      while (true)
      {
        const answer = current_question.solve();

        const now = new Date();

        let rice;
        try {
          rice = await submitQuestion(current_question, answer);
        } catch (err) {
          writeResp(err);
  
          checkBlocked();
  
          if (err && err.response && err.response.data)
          {
            const resp = err.response.data;
  
            if ('errors' in resp)
            {
              if (resp.errors && resp.errors[0])
              {
                if (resp.errors[0].type == 'api-problem')
                {
                  const m = resp.errors[0].title.match(/no\s+question.+level.+(\d+).+category(?: |[^\w])+([0-9a-z\-]+)/i);
  
                  if (m)
                  {
                    level = parseInt(m[1]);
                  }
                }
              }
            }
          }
  
          try {
            await newGame(level);
          } catch (err2) {
            writeResp(err2);
  
            checkBlocked();
          }
        }

        if (!start_rice)
          start_rice = rice;

        const new_rice = rice - start_rice;
        const time = now - start_time;
        const speed = new_rice / time;
        const rps = (speed * 1000).toFixed(2);

        highestSpeed(speed, rps);

        if (i == 0 && rice)
          process.stdout.write(`${' '.repeat(column_size * 2)}\r${rice.toString().padEnd(column_size)}${rps} rps`);
      }
    })
    .catch(err => {
      writeResp(err);
  
      console.error('Error creating new game, try again later');
  
      checkBlocked();
  
      if (config.verbose)
        console.error(err);
    
      process.exit(config.EXIT_ERR_NEWGAME);
    });
})
.catch(err => {
  writeResp(err);

  console.error('Error fetching user profile. You can disable fetching user profiles in the config.json file by setting "fetch_profiles" to false');

  checkBlocked();

  process.exit(config.EXIT_PROFILE);
});



process.on('SIGINT', () => {
  if (config.kill)
  {
    console.log('\nCtrl + C, killing');
  
    execSync(config.kill_cmd);
  }
  else
    console.log('\nCtrl + C');

  process.exit(config.EXIT_SIGINT);
});

process.on('uncaughtException', err => {
  writeResp(err);

  console.error('Uncaught error:', err);

  if (config.kill)
  {
    console.log('Killing');

    execSync(config.kill_cmd);
  }

  process.exit(config.EXIT_UNCAUGHT);
});