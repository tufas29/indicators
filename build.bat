@echo off
call npx expo prebuild

cd android

call gradlew assembleRelease --offline

cd ..