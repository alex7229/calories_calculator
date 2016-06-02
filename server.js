'use strict';
var express =  require('express');
var fs = require('fs');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var mysql = require('mysql');

var app = express();
app.listen(80);




app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(express.static('public'));





class CheckUserData {

    static checkSendData (name, password, newGoods) {
        CheckUserData.checkLegitSymbols(name);
        CheckUserData.checkLegitSymbols(password);
        CheckUserData.checkLength(name);
        CheckUserData.checkLength(password);
        if (newGoods) {
            CheckUserData.checkJSON(newGoods)
        }
    }

    static checkLegitSymbols (data) {
        let regExp = /[^(a-zA-Z0-9)]/g;
        if (data.match(regExp)) {
            throw Error ('Input is not correct');
        }
    }

    static checkLength (data) {
        if (data.length > 16) {
            throw Error ('Name or password should not exceed 16 symbols')
        }
    }

    static checkJSON (goods) {
        try {
            JSON.parse(goods)
        } catch (err) {
            throw Error ('Goods are not in correct form (not valid JSON)')
        }
        let parsedGoods = JSON.parse(goods);
        if (Array.isArray(parsedGoods)) {
            let properties = ['name', 'calories', 'weight', 'priceForWeight'];
            parsedGoods.forEach( (good) => {
                properties.forEach( (property) => {
                    if (!good.hasOwnProperty(property)) {
                        throw Error (`missing ${property} property in goods`)
                    }
                    if (typeof good[property] !== 'string') {
                        throw Error (`${property} property is not string type`)
                    }
                    if (property !== 'name') {
                        let value = good[property];
                        let regExp = /^\s*([0-9]*(?:[\.,][0-9]+)?)\s*$/;
                        if (value.match(regExp) === null) {
                            throw Error (`not correct numbers`)
                        }
                    } else {
                        if (good[property].length === 0) {
                            throw Error ('Good name can\'t be 0 characters long')
                        }
                    }
                })
            })
        } else {
            throw Error ('Goods data is not correct (not array)')
        }

    }

    static checkDeleteGoodNames (arrayOfNames) {
        try {
            JSON.parse(arrayOfNames)
        } catch  (err) {
            throw Error ('Goods are not in correct form (not valid JSON)')
        }
        let names = JSON.parse(arrayOfNames);
        if (Array.isArray(names)) {
            names.forEach( (name) => {
                if (typeof name !=='string') {
                    throw Error('Some value is not string')
                }
            })
        } else {
            throw Error ('It\'s not array')
        }
    }



}



class Database {

    static findUserPassword (path, name, password) {
        return new Promise ((resolve, reject) => {
            Database.readFile(path)
            .then (data=> {
                if (data !== '') {
                    let user = data.filter( (user) => {
                        return user.name === name
                    });
                    if (user.length === 0) {
                        resolve ('new user')
                    } else if (user[0].password === password) {
                        resolve ('old user')
                    } else {
                        reject ('not correct password')
                    }
                } else {
                    resolve('new user')
                }
            }, error => {
                reject(error.message)
            });
        })
    }

    static findUserGoods (path, name) {
        return new Promise ( (resolve) => {
            Database.readFile(path)
                .then ( (data) => {
                    let user = data.filter( (user) => {
                        return user.name === name
                    });
                    resolve( user[0].goods);
                });
        });
    }

    static readFile (path) {
        return new Promise ( (resolve, reject) => {
            fs.readFile(__dirname+path, 'utf8', (err, data) => {
                if (err) reject(err.message);
                let database = JSON.parse(data);
                resolve(database);
            });
        })
    }

    static writeFile (path, stringData) {
        return new Promise ( (resolve, reject) => {
            fs.writeFile(__dirname + path, stringData, (err) => {
                if (err) reject (err);
                resolve ('saved')
            });
        })
    }

    static updateUserGoods (path, name, newGoods) {
        return new Promise( (resolve, reject) => {
            Database.readFile(path)
                .then ( (database) => {
                    let currentUser = database.filter( (user) => {
                        return user.name === name
                    });
                    let currentUserGoods = currentUser[0].goods;
                    currentUserGoods = currentUserGoods.concat(JSON.parse(newGoods));
                    Database.deleteDuplicates(currentUserGoods);
                    let newDatabase = database.map( (user) => {
                        if (user.name === name) {
                            return {
                                name: name,
                                password: user.password,
                                goods: currentUserGoods
                            }
                        } else {
                            return user
                        }
                    });
                    Database.writeFile(path, JSON.stringify(newDatabase))
                    .then ( () => {
                        resolve ('saved')
                    }, error => {
                        reject(error.message)
                    })
                })
        })
    }

    static saveUserGoods (path, name, password, newGoods) {
        return new Promise ( (resolve, reject) => {
            Database.readFile(path)
            .then ( (data) => {
                let userGoods = {
                    name: name,
                    password: password,
                    goods: JSON.parse(newGoods)
                };
                Database.deleteDuplicates(userGoods.goods);
                data.push(userGoods);
                Database.writeFile(path, JSON.stringify(data))
                .then ( result => {
                    resolve (result)
                })
            })
        })
    }

    static deleteUserGoods (path, name, goodList) {
        return new Promise( (resolve, reject) => {
            Database.readFile(path)
                .then ( (database) => {
                    let currentUser = database.filter( (user) => {
                        return user.name === name
                    });
                    let currentUserGoods = currentUser[0].goods;
                    let goodsAfterDelete = currentUserGoods.filter( (good) => {
                        if (!goodList.includes(good.name)) {
                            return true
                        }
                    });
                    let newDatabase = [];
                    database.forEach( (user) => {
                       if (user.name === name) {
                           if (goodsAfterDelete.length !== 0) {
                               newDatabase.push({
                                   name: name,
                                   password: user.password,
                                   goods: goodsAfterDelete
                               })
                           }
                       } else {
                           newDatabase.push(user)
                       }
                    });
                        Database.writeFile(path, JSON.stringify(newDatabase))
                            .then ( () => {
                                resolve ('saved')
                            }, error => {
                                reject(error.message)
                            })

                })
        })
    }

    static deleteDuplicates (goods) {
        var i;
        for (i=0; i<goods.length; i++) {
            let hasDuplicates = false;
            for (let j=i+1; j<goods.length; j++) {
                if (goods[i].name === goods[j].name) {
                    hasDuplicates = true;
                    break
                }
            }
            if (hasDuplicates) {
                goods.splice(i,1);
                i--
            }
        }
    }
}


class Server  {

    static listenFindData () {
        app.post('/calories/findData', function(req, res, next) {
            try {
                CheckUserData.checkSendData(req.body.name, req.body.password);
            } catch (err) {
                res.status(500).end(err.message);
                next(err);
            }
            next();
        },(req, res) => {
            let path = '/usersData/calories.txt';
            Database.findUserPassword(path, req.body.name, req.body.password)
                .then ((result) => {
                    if (result === 'old user') {
                        Database.findUserGoods(path, req.body.name)
                            .then ( (goods) => {
                                res.send(JSON.stringify(goods))
                            }, errorName => {
                                res.status(500).send(errorName)
                            });
                    } else if (result === 'new user') {
                        res.send(JSON.stringify([]))
                    }
                }, errorName => {
                    res.status(500).send(errorName);
                });
        });
    }

    static listenUpdateData() {
        app.post('/calories/updateData', (req,res,next) => {
            try {
                CheckUserData.checkSendData(req.body.name, req.body.password, req.body.newGoods);
            } catch (err) {
                res.status(500).end(err.message);
                next(err);
            }
            console.log(req.body.newGoods);
            next();
        }, (req, res) => {
            let path = '/usersData/calories.txt';
            Database.findUserPassword(path, req.body.name, req.body.password)
                .then ( (result) => {
                    if (result === 'old user') {
                        Database.updateUserGoods(path, req.body.name, req.body.newGoods)
                            .then ( (resolve) => {
                                res.send('data is saved')
                            }, error => {
                                res.status(500).end(error.message)
                            })
                    } else if (result === 'new user') {
                        Database.saveUserGoods(path, req.body.name, req.body.password, req.body.newGoods)
                            .then ( () => {
                                res.send('data is saved')
                            }, error => {
                                res.status(500).end(error.message)
                            })
                    }
                }, errorName => {
                    res.status(500).send(errorName)
                })
        });
    }

    static listenDeleteData() {
        app.post('/calories/deleteData', (req, res, next) => {
            try {
                CheckUserData.checkSendData(req.body.name, req.body.password);
                CheckUserData.checkDeleteGoodNames(req.body.deletedNames)
            } catch (err) {
                res.status(500).end(err.message);
                next(err);
            }
            console.log(req.body.deletedNames);
            next()
        }, (req, res) => {
            let path = '/usersData/calories.txt';
            Database.findUserPassword(path, req.body.name, req.body.password)
                .then ( (result) => {
                    if (result === 'old user') {
                        Database.deleteUserGoods(path, req.body.name, req.body.deletedNames)
                            .then ( (resolve) => {
                                res.send('data is saved')
                            }, error => {
                                res.status(500).end(error.message)
                            })
                    }
                }, errorName => {
                    res.status(500).send(errorName)
                })
        });
    }
    
    static listenGetHTML() {
        app.post('/philippine-crosswords/getHTML', (req, res) => {
            let headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
                'accept-language' :'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4,uk;q=0.2'
            };
            var request = require (`request`);
            let uri = req.body.pageUri;
            request({
                url: uri,
                method: 'GET',
                headers: headers
            }, function saveResponse (error, response, body) {
                if (error) {
                    res.status(500).send(error)
                } else {
                    res.send(body);
                }
            });






         
        })
    }

    static start () {
        Server.listenFindData();
        Server.listenUpdateData();
        Server.listenDeleteData();
        Server.listenGetHTML();
    }

}

Server.start();


var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'mypassword',
    database: 'world_x'
});

connection.connect();


connection.query({
    sql: 'select * from `city` where `countrycode`=?',
    values: ['ukr']
}, function (err, results, fields){
    console.log(results[0]['ID'])
});

connection.end();
