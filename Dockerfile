FROM node:7.2-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
COPY npm-shrinkwrap.json /usr/src/app/
RUN npm install --only=prod

# Bundle app source
COPY . /usr/src/app

# Expose proxy ports
EXPOSE 80
EXPOSE 443

CMD [ "npm", "start" ]
