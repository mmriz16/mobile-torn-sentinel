Update EAS :
eas update --branch production --message "fix supabase connection config"

Update EAS (Only Android):
eas update --platform android --branch production --message "fix supabase connection config"

Build AAB :
java -jar bundletool.jar build-apks --bundle=app-release.aab --output=app-release.apks --ks=torn-key.jks --ks-pass=pass:"Kaozi!86g27." --ks-key-alias=torn-sentinel --key-pass=pass:"Kaozi!86g27." --mode=universal

Check Password :
eas credentials

Please run the eas update command for android production, but generate the --message content automatically based on my recent file changes.