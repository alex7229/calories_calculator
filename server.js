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
            let properties = ['good_name', 'calories_per_100grams', 'price_per_1kg'];
            parsedGoods.forEach( (good) => {
                properties.forEach( (property) => {
                    if (!good.hasOwnProperty(property)) {
                        throw Error (`missing ${property} property in goods`)
                    }
                    if (typeof good[property] !== 'string') {
                        throw Error (`${property} property is not string type`)
                    }
                    if (property !== 'good_name') {
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

    constructor () {
        this.sqlConnection;
    }

    connect (databaseName) {
        this.sqlConnection = mysql.createConnection({
            host     : 'localhost',
            user     : 'root',
            password : 'mypassword',
            database: databaseName
        });
        this.sqlConnection.connect();
    }

    dropConnection () {
        this.sqlConnection.end()
    }

    findUserId (name, password) {
        return new Promise ( (resolve, reject) => {
            let sql = `SELECT id, password FROM users_auth WHERE name = ${this.sqlConnection.escape(name)}`;
            this.sqlConnection.query(sql, (err, results) => {
                if (err) reject(err.message);
                if (results.length === 1) {
                    let storedPassword = results[0].password;
                    if (storedPassword === password) {
                        resolve(results[0].id);
                    } else {
                        reject ('not correct password')
                    }
                } else {
                    //new user
                    this.addUserAuth(name, password)
                        .then( () => {
                            return this.findUserId(name, password)
                        }, (err) => {
                            reject(err.message)
                        });
                }
            });
        });
    }

    addUserAuth (name, password) {
        return new Promise ( (resolve, reject) => {
            let sql = `INSERT INTO users_auth (name, password) VALUES (${this.sqlConnection.escape(name)}, ${this.sqlConnection.escape(password)})`;
            this.sqlConnection.query(sql, (err, results) => {
                if (err) reject(err);
                if (results) resolve ('success')
            });
        });
    }

    findUserGoods (id) {
        return new Promise ( (resolve, reject) => {
            let sql = `SELECT good_name, calories_per_100grams, price_per_1kg FROM goods WHERE id = ${this.sqlConnection.escape(id)}`;
            this.sqlConnection.query(sql, (err, results) => {
                if (err) reject(err.name);
                resolve(results);
            });
        });
    }

    /*static readFile (path) {
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
    }*/

    updateUserGoods (id,  newGoods) {
        Database.deleteDuplicates(newGoods);
        return new Promise ( (resolve, reject) => {
            this.findUserGoods(id)
                .then ( (storedGoods) => {
                    return Database.checkInsertOrUpdate(newGoods, storedGoods)
                })
                .then( result => {
                    return this.multipleInsertUserGoods(id, result.insertGoods)
                })

        });













    }

    multipleInsertUserGoods (id, newGoods) {
        return new Promise ( (resolve, reject) => {
            console.log(newGoods);
            let sql = `INSERT INTO goods (good_name, calories_per_100grams, price_per_1kg, id) `;
            let sqlQuery = newGoods.map( (good) => {
                return `SELECT '${this.sqlConnection.escape(good.good_name)}', ${this.sqlConnection.escape(good.calories_per_100grams)}, ${this.sqlConnection.escape(good.price_per_1kg)} UNION ALL `;


                /*

                 multiple insert

                 INSERT INTO dbo.MyTable (ID, Name)
                 SELECT 123, 'Timmy'
                 UNION ALL
                 SELECT 124, 'Jonny'
                 UNION ALL
                 SELECT 125, 'Sally'*/
            }).join('').slice(0, -11);
            console.log(sql+sqlQuery)

        })



    }

    updateGoodRow (id, newGood) {
        return new Promise( (resolve, reject) => {

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
                if (goods.length === 1) return;
                let hasDuplicates = false;
                for (let j=i+1; j<goods.length; j++) {
                    if (goods[i].good_name === goods[j].good_name) {
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

    static checkInsertOrUpdate (newGoods, storedGoods) {
        let insertGoods = [];
        let updateGoods = [];
        newGoods.forEach( newGood => {
            let sameGood = storedGoods.filter ( storedGood => {
                return storedGood.good_name === newGood.good_name
            });
            if (sameGood.length === 1) {
                updateGoods.push(newGood)
            } else {
                insertGoods.push(newGood)
            }
        });
        return {
            updateGoods,
            insertGoods
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
            let caloriesDatabase = new Database();
            caloriesDatabase.connect('calories');
            caloriesDatabase.findUserId(req.body.name, req.body.password)
                .then((resultID) => {
                    return caloriesDatabase.findUserGoods(resultID);
                })
                .then( (userGoods) => {
                    return res.send(JSON.stringify(userGoods))
                })
                .then( () => {
                    return caloriesDatabase.dropConnection();
                })
                .catch( (err) => {
                    res.status(500).end(err);
                })
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
            next();
        }, (req, res) => {
            let caloriesDatabase = new Database();
            caloriesDatabase.connect('calories');
            caloriesDatabase.findUserId(req.body.name, req.body.password)
                .then((userId) => {
                    return caloriesDatabase.updateUserGoods(userId, JSON.parse(req.body.newGoods))
                })
                .catch( (err) => {
                    res.status(500).end(err);
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
        app.post('/getPageHTML', (req, res) => {
            let headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
                'accept-language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4,uk;q=0.2'
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

    static listenGetTranslation () {
        app.post('/getTranslation', (req, res) => {
            let key = `dict.1.1.20160720T151834Z.0891ee1d5583e351.d2e3090bd6ae6a0faf763b3082f3839f5781e8f3`;
            let apiUrl = `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${key}&lang=en-${req.body.language}&text=${req.body.word}`;
            const request = require('request');
            request({
                url: apiUrl,
                method: 'GET'
            }, (err, response, body) => {
                if (err) {
                    res.status(500).send(error)
                } else {
                    res.send(body)
                }
            })
        })
    }

    static listenGetMeaning () {
        app.post('/getMeaning', (req, res) => {
            let apiUrl = `http://google-dictionary.so8848.com/meaning?word=${req.body.word}`;
            const request = require('request');
            request({
                url: apiUrl,
                method: 'GET'
            }, (err, response, body) => {
                if (err) {
                    res.status(500).send(error)
                } else {
                    res.send(body)
                }
            })
        })
    }


    static start () {
        Server.listenFindData();
        Server.listenUpdateData();
        Server.listenDeleteData();
        Server.listenGetHTML();
        Server.listenGetTranslation();
        Server.listenGetMeaning();
    }

}

Server.start();


(function saveData () {
    const fs = require('fs');
    fs.readFile('public/learnWords/wordsLists/sorted_34k.txt', 'utf8', (err, data) => {
        if (err) throw err;
        let words = JSON.parse(data);





        function getTranslation (word) {
            let key = `dict.1.1.20160720T151834Z.0891ee1d5583e351.d2e3090bd6ae6a0faf763b3082f3839f5781e8f3`;
            let apiUrl = `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${key}&lang=en-ru&text=${word}`;
            const request = require('request');
            request({
                url: apiUrl,
                method: 'GET'
            }, (err, response, body) => {
                if (err) {
                    throw err
                } else {
                    let data = JSON.parse(body);
                    if (data.def.length !== 0) {
                        fs.writeFile(`public/learnWords/wordsLists/yandexTranslations/${word}.txt`,  body, {flag: 'wx'},  (err) => {
                            if (err) {
                                console.log(err.message)
                            }
                            console.log('It\'s saved!');
                        });


                        /*console.log(`there is translation`);
                        console.log(body)*/




                    } else {
                        console.log(`Don\'t find translation. Word was ${word}`)
                    }
                }
            });
        }




        function read (word) {
            fs.readFile(`public/learnWords/wordsLists/yandexTranslations/${word}.txt`, 'utf8', (err, data) => {
                if (err) {
                    getTranslation(word)
                } else {

                }
            })
        }



        /*(function findWords () {
            let seconds = [];
            for (let i=10; i<10000; i+=10) {
                seconds.push(i)
            }
            for (let j=25; j<80; j++) {
                setTimeout(function () {
                    console.log(`start word with number ${j*100}`);
                    for (let k=j*100; k<j*100+100; k++) {
                        read(words[k].word)
                    }
                }, seconds[j-25]*1000);

            }
        }());*/

        //saved first 1k words (every chunk of data is 100 words, time between requests is 10 secs)
        //try to save another 8k words - total 9k
        // saved only 3k?



    });
}());

