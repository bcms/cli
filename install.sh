sudo apt update
sudo apt install nodejs npm -y
sudo npm i -g n --unsafe-perm
sudo n 14
sudo npm i -g ./cli.tgz --unsafe-perm

echo "bcms --instance 6169756ef956f26df700c2d7 --install --terminal-login" > install
chmod 755 install
rm build