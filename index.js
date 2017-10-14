const SkyScanner = require('./skyscanner/skyscanner')

const express = require('express')
// const bodyParser = require('body-parser')
const app = express()
const PORT = 3000
require('dotenv').config()

// app.use(bodyParser.json())

// respond with "hello world" when a GET request is made to the homepage
app.get('/api', function (req, res) {
  res.send('hello world')
})

app.get('/api/flights', async (req, res) => {
  if (!req.query.origin) {
    res.send({error: 'Expected origin location'})
    return
  }
  if (!req.query.destination) {
    res.send({error: 'Expected destination location'})
    return
  }
  if (!req.query.departing) {
    res.send({error: 'Expected departing time'})
    return
  }
  if (!req.query.returning) {
    res.send({error: 'Expected returning date'})
    return
  }
  if (!req.query.currency) {
    req.query.currency = 'gbp'
  }

  try {
    let allData = await SkyScanner.Flights.BrowseRoutes('UK', req.query.currency, 'en-US', req.query.origin, req.query.destination, req.query.departing, req.query.returning)

    const flights = allData.Quotes
    const places = allData.Places.reduce((map, places) => {
      map[places.PlaceId] = places
      return map
    })
    const carriers = allData.Carriers.reduce((map, carrier) => {
      map[carrier.CarrierId] = carrier.Name
      return map
    })
    
    console.log(places)

    const flightsWithPlaces = flights.map((f) => {
      let fw = f
      fw.OutboundLeg.Carriers = f.OutboundLeg.CarrierIds.map((c) => {
        return carriers[c + '']
      })
      fw.OutboundLeg.Origin = places[f.OutboundLeg.OriginId + '']
      fw.OutboundLeg.Departure = places[f.OutboundLeg.DestinationId + '']
      
      fw.InboundLeg.Carriers = f.InboundLeg.CarrierIds.map((c) => {
        return carriers[c + '']
      })
      fw.InboundLeg.Origin = places[f.InboundLeg.OriginId + '']
      fw.InboundLeg.Departure = places[f.InboundLeg.DestinationId + '']
      return fw
    })

    res.send(flightsWithPlaces)
  } catch (e) {
    console.log(e)
    res.send(e.message)
  }
})

app.use('/', express.static('public'))

app.listen(PORT)
console.log('Running at http://localhost:3000')
