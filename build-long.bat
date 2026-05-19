@echo off
call npx expo prebuild --clean

cd android

call gradlew --stop
call gradlew clean
call gradlew assembleRelease

cd ..
