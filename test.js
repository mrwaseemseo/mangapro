const express = require('express');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const cheerio = require('cheerio');
const app = express();
const path = require('path');
const port = 3000;

app.set('view engine', 'pug');
app.locals.basedir = path.join(__dirname, 'views');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', async (req, res) => {
  try {
    // Fetch the data from the website
    const response = await fetch('https://mangasee123.com/read-online/Tales-Of-Vesperia-chapter-20.html');
    const data = await response.text();
    const $ = cheerio.load(data);
    const imageURlS = [];
        $('.ng-scope img.img-fluid').each((index, element) => {
            const src = $(element).attr('src');
            imageURlS.push(src);
        });
    // Pass the data to the Pug template
    res.render('test', { imageURlS });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
