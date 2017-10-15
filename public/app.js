function encodeQs (params) {
  var query = Object.keys(params)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&')
  return '?' + query
}

async function queryNewFlights (qs) {
  let data = {
    origin: qs.startDate === undefined ? 'uk' : qs.originCountry,
    destination: 'anywhere',
    departing: qs.startDate === undefined ? 'anytime' : qs.startDate,
    returning: qs.endDate === undefined ? 'anytime' : qs.endDate
  }
  try {
    let response = await fetch('/api/flights' + encodeQs(data))
    return await response.json()
  } catch (e) {
    console.log(e)
    throw e
  }  
}

function findCountryCosts (flights) {
  let country = {}
  
  flights.forEach((f) => {
    // console.log(f)
    if (country[f.OutboundLeg.Destination.CountryName] !== undefined) {
      let cData = country[f.OutboundLeg.Destination.CountryName]
      cData.push({cost: f.MinPrice, destination: f.OutboundLeg.Destination})
      country[f.OutboundLeg.Destination.CountryName] = cData
    } else {
      country[f.OutboundLeg.Destination.CountryName] = [{cost: f.MinPrice, destination: f.OutboundLeg.Destination}]
    }
  })
  return country
}

async function mergeResults (qs) {
  let flights = await queryNewFlights(qs)
  
  let countryCosts = findCountryCosts(flights)
  console.log(euCountries.features.length)
  for (let i = 0; i < euCountries.features.length; i++) {
    if (countryCosts[euCountries.features[i].properties.sovereignt]) {
      let cost = countryCosts[euCountries.features[i].properties.sovereignt][0].cost
      let budget = searchParams.get("budget")
      
      euCountries.features[i].properties.SkyScanner = '£ ' + cost
      euCountries.features[i].properties.SkyScannerDestination = countryCosts[euCountries.features[i].properties.sovereignt][0].destination
      console.log(cost)
      if ((cost / budget) < 0.4) {
        console.log(0)
        euCountries.features[i].properties.bdgColor = 4
        continue
      }
      if ((cost / budget) < 0.7) {
        euCountries.features[i].properties.bdgColor = 3
        continue
      }
      if ((cost / budget) < 0.90) {
        euCountries.features[i].properties.bdgColor = 2
        continue
      }
      if ((cost / budget) < 1) {
        euCountries.features[i].properties.bdgColor = 1
        continue
      }
        euCountries.features[i].properties.bdgColor = 0
    }
  }
  
  var vectorGrid = L.vectorGrid.slicer(euCountries, {
    rendererFactory: L.svg.tile,
    vectorTileLayerStyles: {
      sliced: function (properties, zoom) {
        var p = properties.bdgColor
        return {
          fillColor: p === 0 ? '#000000'
            : p === 1 ? '#f60c00'
              : p === 2 ? '#f66300'
                : p === 3 ? '#f6ec00' : p === 4 ? '#6cf600' : '#ffffff',
          fillOpacity: 0.5,
          // 					fillOpacity: 1,
          stroke: true,
          fill: true,
          color: 'black',
          // 							opacity: 0.2,
          weight: 0,
        }
      }
    },
    interactive: true,
    getFeatureId: function (f) {
      return f.properties.wb_a3
    }
  })
    .on('mouseover', function (e) {
      var properties = e.layer.properties
      L.popup()
        .setContent(`<h3>${properties.name}</h3>
          <ul style="list-style: none; padding-left: 5px;">
          <li><b>Price:</b> ${properties.SkyScanner}</li>
          <li><b>Airport:</b> ${properties.SkyScannerDestination.Name}</li>
          </ul>
           `)
        .setLatLng(e.latlng)
        .openOn(map)

      clearHighlight()
      highlight = properties.wb_a3
      var p = properties.bdgColor % 5
      var style = {
        fillColor: p === 0 ? '#ED7273'
          : p === 1 ? '#E31A1C'
            : p === 2 ? '#FEB24C'
              : p === 3 ? '#B2FE4C' : '#FFEDA0',
        fillOpacity: 0.5,
        fillOpacity: 1,
        stroke: true,
        fill: true,
        color: 'red',
        opacity: 1,
        weight: 2,
      }

      vectorGrid.setFeatureStyle(properties.wb_a3, style)
    })
    .addTo(map)
  
  var highlight
  var clearHighlight = function () {
    if (highlight) {
      vectorGrid.resetFeatureStyle(highlight)
    }
    highlight = null
  }

  map.on('click', clearHighlight)
}
