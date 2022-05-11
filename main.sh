#!/bin/bash

THREADS="$1"

if [ -z $THREADS ]; then
  THREADS=2
fi

export C=0

main () {
  if [ "$1" = "main" ]; then
    echo Running $C/$THREADS bash threads
    echo
  fi

  node index.js
}

for (( i=1; i<=`expr $THREADS - 1`; i++ ))
do
  C=`expr $C + 1`

  main > /dev/null &
done

C=`expr $C + 1`
main main