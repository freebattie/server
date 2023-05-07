export const getWeatherData = (city) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`;
  
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let data = '';
  
        response.on('data', (chunk) => {
          data += chunk;
        });
  
        response.on('end', () => {
          const weatherData = JSON.parse(data);
          const windSpeed = weatherData.wind.speed;
          resolve(windSpeed);
        });
  
      }).on("error", (err) => {
        reject(err);
      });
    });
  }
  