# FreericeHack for NodeJS

This is a better version of the [python FreericeHack](https://github.com/lafkpages/FreericeHack) also made by me.

## How to use

### Dependencies:
* axios@0.26.1

Install dependencies and run `npm start` to run the program

## Configuration

To change the bot configuration, modify the `config.json` file. The following table shows the available properties that can be used.

| Property          | Type   | Meaning                                       |
| ----------------- | ------ | --------------------------------------------- |
| EXIT_BLOCKED      | `int`  |Exit code for when the bot gets blocked       |
| EXIT_SIGINT       | `int`  |Exit code for when someone interrupts the bot |
| EXIT_ERR_NEWGAME  | `int`  |Exit code for when there's an error creating a new game |
| EXIT_UNCAUGHT     | `int`  |Exit code for any uncaught errors             |
| EXIT_PROFILE      | `int`  |Exit code for when there's an error fetching a user's profile |
| default_headers   | `obj`  |The default headers to send on each request. Recommended not to change |
| default_users     | `obj`  |List of user IDs to run the bot on. This can be overriden with environment variables like `$FREERICE_UID` or `$FREERICE_USER` |
| default_user      | `str`  |Default user ID if there is no environment variable set and the `default_users` list is empty |
| category          | `str`  |The category ID to use. This should always be `"66f2a9aa-bac2-5919-997d-2d17825c1837"` for the bot to work |
| http_timeout      | `int`  |The timeout for HTTP requests (in ms)         |
| kill              | `bool` |If the program should kill a process on error |
| kill_cmd          | `str`  |The kill command to run if `kill` is set to true |
| verbose           | `bool` |Logs extra debugging messages to the console  |
| threads           | `int`  |The amount of bots to run simultaneously      |
| fetch_profiles    | `bool` |Wether to fetch user profiles and show profile info |
| log_highest_speed | `bool` |Keeps track of the highest speed reached by the bot |