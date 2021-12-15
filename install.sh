sudo apt update
sudo apt install nodejs npm -y
sudo npm i -g n
sudo n 14
sudo npm i -g ./bcms-cli.tgz

echo "bcms --instance 6169756ef956f26df700c2d7 --install --terminal-login" > install
chmod 755 install
rm build