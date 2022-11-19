const express = require('express')
var bodyParser = require('body-parser')
var cors = require('cors')

const app = express()
const port = process.env.PORT ||  3000

// middleware 
app.use(cors())
app.use(bodyParser.urlencoded({extended:true}))


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})