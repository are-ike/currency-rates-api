const cors = require('cors'),
      express =  require('express'),
      axios = require('axios');

const app = express();

app.use(express.json());
app.use(cors());

const errMsg = `Invalid Request. Suggestions: Do not put a comma after listing the last currency. ` +
 `Currency acronyms consist of three letters only. ` +    
 `Use a comma to separate the currencies. There can only be one base currency.`;

app.get('/', (req, res) => res.status(200).json('Welcome'));

app.get('/api/rates' , (req, res) => {
    //get base and currency from the query
    let {base, currency} = req.query;

    //Ensuring base and currency values
    if(base === undefined || currency === undefined){
        return res.status(400).json('Base and currency values needed. '+
         'Request should look like: /api/rates?base={base}&currency={currency} ');
    }

    base = base.toUpperCase();
    currency = currency.toUpperCase();

    //get rates and initial base ie EUR from api 
    axios.get('https://api.exchangeratesapi.io/latest').then((response) => {
        const rates = response.data.rates;
        const initialBase = response.data.base;
        // object to store the new rates of the requested currencies
        let newRates = {};

        const date = new Date().toISOString().slice(0, 10);

        //Validating base
        if(base.length !== 3){
            return res.status(400).json(errMsg);
        }else if(base !== initialBase && !Object.keys(rates).includes(base)){
            return res.status(404).json('Base Currency Not Found');
        }

        //Validating currency
        if(currency.length % 4 === 3){
            currency = currency.split(',');
        }else if(currency.length === 3){
            currency = [currency];
        }else{
            return res.status(400).json(errMsg);
        }

        for(let i = 0; i < currency.length; i++){
            if(rates[currency[i]] === undefined && currency[i] !== 'EUR'){
                if(currency[i].length !== 3){
                    return res.status(400).json(errMsg);
                }
                return res.status(404).json(`${currency[i]} Currency Not Found`);
            }
        }
        
        //if requested base is same as initial base ie EUR
        if(base === initialBase){
            //set the values of the currencies to their values from the api
            currency.forEach(x => {
                newRates[x] = rates[x].toFixed(9);
            })
        }else{
            const baseValue = rates[base]; //get value of base 
            const eurExchange = 1/baseValue; //calculate how much 1 base currency will be in euro 
            rates['EUR'] = eurExchange; //add the entry of euro with its new rate to rates

            currency.forEach(x => {
                if(x !== 'EUR'){ //if one of the currencies is euro then skip this conversion to base currency
                    newRates[x] = (rates[x]/baseValue).toFixed(9);
                }else{
                    newRates[x] = rates[x].toFixed(9);
                }
            
            })
        }
        res.status(200).json({
            results: {
                base,
                date,
                rates: newRates
            }
        })
    })
    .catch(err => res.status(502).json("Unable to retrieve data"))
})

app.listen(process.env.PORT || 3000 , '0.0.0.0', () => {
    console.log('running');
})