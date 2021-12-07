sudo apt update
sudo apt install nodejs npm - y
sudo npm i -g n
sudo n 14
sudo npm i -g ./bcms-cli.tgz

echo "bcms --instance --run" >> install
chmod 755 install
rm build