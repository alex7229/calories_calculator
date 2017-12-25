"use strict";


class Controller {

    constructor () {
        this.addGoodsFormsCount = 0;
        this.calculateCaloriesFormsCount = 0;
        this.prevFocusedElemId = ``;
        this.name = '';
        this.password = ''
    }


    listenFocusedElements () {
        let self = this;
        document.addEventListener('focus',function(event){
            let elem = event.srcElement;
            if (elem.className === 'calculatedInput') {
                self.prevFocusedElemId = elem.id
            }
        }, true);
    }

    findData () {
        return new Promise ( (resolve) => {
            let name = this.name;
            let password = this.password;
            $.post( "/calories/findData", { 'name':name, password: password } )
                .done( data => {
                    resolve (data)
                });
        });

    }

    static showDeleteForm () {
        $('#deleteGoodsForm').css('display', 'block');
    }

    static sendDeleteNames (name, password) {
        return new Promise ( (resolve, reject) => {
            let input = $('#deleteGoods');
            if (input.val() !== '') {
                let names = input.val().split(',');
                names = names.map( (value) => {
                    let firstChar = value[0];
                    let regExp = /\s/;
                    if (firstChar.match(regExp)) {
                        return value.slice(1)
                    } else {
                        return value
                    }
                });
                $.post('/calories/deleteData', {'name':name, password: password, 'deletedNames':JSON.stringify(names)})
                    .done (data => {
                        resolve(data)
                    })
                    .fail (err => {
                        reject(err.responseText)
                    });
            } else {
                reject('nothing to store')
            }
            input.val('');
            $('#deleteGoodsForm').css('display', 'none')
        });
    }

    addGood (name, password) {
        return new Promise ( (resolve, reject) => {
            if (this.addGoodsFormsCount === 0) {
                reject ('nothing to update')
            } else {
                let newGoods = [];
                let inputNames = ['goodName', 'calories', 'weight', 'priceForWeight', 'fats', 'proteins', 'carbohydrates'];
                for (let i=1; i<=this.addGoodsFormsCount; i++) {
                    let inputIDs = [`#goodName${i}`, `#calories${i}`, `#priceWeight${i}`, `#price${i}`];
                    let currentGood = {};
                    for (let j=0; j<inputIDs.length; j++) {
                        let value = $(inputIDs[j]).val();
                        if (j!==0) {
                            value = value.replace(',', '.')
                        }
                        currentGood[inputNames[j]] = value;
                    }
                    let specificGood = Controller.calculateSpecificUnits(currentGood);
                    newGoods.push(specificGood);
                    let formId = `#form${i}`;
                    $(formId).remove();
                }
                this.addGoodsFormsCount = 0;
                $.post('/calories/updateData', {'name':name, password: password, 'newGoods':JSON.stringify(newGoods)})
                    .done (data => {
                        resolve(data)
                    })
                    .fail ( (err) => {
                        reject(err.responseText)
                    })
            }
        });
    }


    static calculateSpecificUnits (good) {
        let weight = parseFloat(good.weight);
        let price = parseFloat(good.priceForWeight);
        let specificPrice = (price/weight*1000).toString();
        return {
            good_name: good.goodName,
            calories_per_100grams: good.calories,
            price_per_1kg: specificPrice
        }
    }


    updateAllData () {
        let name = this.name;
        let password = this.password;
        this.addGood(name, password)
            .catch (err => {
                console.log(`error occurs in addGood method - '${err}'`)
            })
            .then ( () => {
                return Controller.sendDeleteNames(name, password)
            })
            .then ( () => {
                console.log('updating is invoked');
                calculate.getGoods()
            }, err => {
                console.log(`error occurs in sendDelete method - '${err}'`)
            });
    }

    static setValue () {
        let value = window.event.toElement.innerText;
        let inputId = `#${controller.prevFocusedElemId}`;
        $(inputId).val(value);
    }

    insertAddGoodForm () {
        this.addGoodsFormsCount++;
        let num = this.addGoodsFormsCount;
        let formHTML = `
        <form class="goodForm" id="form${num}">
            <label for="goodName${num}">name of good</label><br>
            <input id='goodName${num}' type="text" autocomplete="off"><br>
            <label for="calories${num}">Calories per 100 grams</label><br>
            <input id='calories${num}' type="number" autocomplete="off"><br>
            <label for="fats${num}">Fats per 100 grams</label><br>
            <input id='fats${num}' type="number" autocomplete="off"><br>
            <label for="proteins${num}">Proteins per 100 grams</label><br>
            <input id='proteins${num}' type="number" autocomplete="off"><br>
            <label for="carbohydrates${num}">Carbohydrates per 100 grams</label><br>
            <input id='carbohydrates${num}' type="number" autocomplete="off"><br>
            <label for="priceWeight${num}">Good weight in grams</label><br>
            <input id='priceWeight${num}' type="number" autocomplete="off"><br>
            <label for="price${num}">Price for current weight</label><br>
            <input id='price${num}' type="number" autocomplete="off"><br>
        </form>`;
        $('#formsContainer').append(formHTML)
    }

    showCalculateForm () {
        if (this.calculateCaloriesFormsCount === 0) {
            $('#calculateCalories').css('display', 'block');
            this.insertInputs();
            calculate.getGoods();
            $('#goodsList').css('display', 'block')
        }
    }

    insertInputs () {
        this.calculateCaloriesFormsCount++;
        let inputs = `<label for="calculateGoodName${this.calculateCaloriesFormsCount}">name of good</label><br>
        <input id="calculateGoodName${this.calculateCaloriesFormsCount}" class="calculatedInput"><br>
        <label for="calculateGoodWeight${this.calculateCaloriesFormsCount}">Weight in grams</label><br>
        <input type="number" id="calculateGoodWeight${this.calculateCaloriesFormsCount}"><br>`;
        $('#calculateCalories').append(inputs);
        this.listenCalculatedInput(`#calculateGoodName${this.calculateCaloriesFormsCount}`);
    }

    static insertListGoods (list) {
        let html = ``;
        list.forEach ( (good) => {

        })
    }

    login () {
        let name = $('#name').val();
        let password = $('#password').val();
        let authData = JSON.stringify({name, password});
        localStorage.setItem('authData', authData);
        this.setAuthData();
    }

    logout () {
        localStorage.removeItem('authData');
        this.name = '';
        this.password = '';
        $('#logoutForm').css('display', 'none');
        $('#loginForm').css('display', 'block')
    }

    setAuthData() {
        if (localStorage.getItem('authData')) {
            let authData = JSON.parse(localStorage.getItem('authData'));
            $('#logoutForm').css('display', 'block');
            $('#loginForm').css('display', 'none');
            this.name = authData.name;
            this.password = authData.password;
            $('#currentUser').text(this.name)
        }
    }

    static showPassword () {
        let password = $('#password');
        if (password.attr('type') === 'password') {
            password.attr('type', 'text')
        } else {
            password.attr('type', 'password')
        }
    }

    listenCalculatedInput (id) {
        $(id).keypress( () => {
            console.log(`key was pressed on that id "${id}"`);

        })
    }

}



class Calculate {

    constructor () {
        this.userGoods = []
    }

    getGoods () {
        let self = this;
        controller.findData()
            .then ( (result) => {
                let goods = JSON.parse(result);
                self.userGoods = [];
                self.userGoods = goods;
            })
    }

    showGoods () {
        console.log(this.userGoods)
    }

    getPossibleGoods (goodPart) {
        let possibleGoods = [];
        this.userGoods.forEach( (good) => {
            if (good.name.match(goodPart)) {
                possibleGoods.push(good.name)
            }
        });
        return possibleGoods
    }

}

let controller = new Controller();
controller.listenFocusedElements();
let calculate = new Calculate();
$(document).ready(() => {
    controller.setAuthData();
    calculate.getGoods();
});

