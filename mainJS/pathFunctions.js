const fetch = require('node-fetch'); // fetchs html
const serverName = process.env['https://mangareaders.netlify.app/'] || 'http://localhost:5832/';
var isPupServerLoaded = true;
const moment = require('moment')
const fs = require('fs');
const cheerio = require('cheerio');
const HeaderGenerator = require('header-generator');
const breakCloudFlare = process.env.BREAK_CLOUDFLARE_V1 || 'https://letstrypup-dbalavishkumar.koyeb.app/v2?url=https://mangasee123.com';
const breakCloudFlareV2 = process.env.BREAK_CLOUDFLARE_V2 || 'https://letstrypup-dbalavishkumar.koyeb.app/v2?url=https://mangasee123.com';

const susManga = JSON.parse(fs.readFileSync('./json/susManga.json'));
const isTokenValid = require('./loginFunctions').isTokenValid;
const headersGenerator = new HeaderGenerator({
    browsers: [
        { name: "firefox", minVersion: 80 },
        { name: "chrome", minVersion: 87 },
        "safari"
    ],
    devices: [
        "desktop"
    ],
    operatingSystems: [
        "windows"
    ]
});

async function indexHtml(req, res) {

    if (!isPupServerLoaded) {
        isPupServerLoaded = true;
        return res.render('loading')
    }

    let fetchAllData = await fetch(serverName + 'api/manga/all')
    let resp = await fetchAllData.json();
    resp.susManga = susManga;

    return res.render('index', resp)
}
function calcChapterUrl(ChapterString) {
    //console.log('str:' + ChapterString);
    var Index = "";
    var IndexString = ChapterString.substring(0, 1);
    if (IndexString != 1) {
        Index = "-index-" + IndexString;
    }
    var Chapter = parseInt(ChapterString.slice(1, -1));
    var Odd = "";
    var OddString = ChapterString[ChapterString.length - 1];
    if (OddString != 0) {
        Odd = "." + OddString;
    }

    return "-chapter-" + Chapter + Odd + Index;
}
function calcChapter(Chapter) {
    var ChapterNumber = parseInt(Chapter.slice(1, -1));
    var Odd = Chapter[Chapter.length - 1];
    if (Odd == 0) {
        return ChapterNumber;
    } else {
        return ChapterNumber + "." + Odd;
    }
}
function calcDateForMangaPage(e) {
    var t = moment(e).subtract(9, "hour")
    n = moment(),
        m = n.diff(t, "hours");
    return n.isSame(t, "d") ? moment(e).subtract(9, "hour").fromNow() : m < 24 ? moment(e).subtract(9, "hour").calendar() : moment(e).subtract(9, "hour").format("L");
}
function calcDateForMangaChapters(Date) {
    var daysPassed = moment().diff(Date, "d");
    if (daysPassed === 0) {
        return moment(Date).fromNow()
    } else {
        return moment(Date).calendar()
    }
    return moment().diff(Date, "d");
}
function fixChaptersArry(chapters, indexName, mangaPage = false) {
    chapters = JSON.parse(chapters);
    for (var i = 0; i < chapters.length; i++) {
        chapters[i].ChapterLink = indexName + calcChapterUrl(chapters[i].Chapter)
        chapters[i].Chapter = calcChapter(chapters[i].Chapter);
        if (mangaPage) {
            chapters[i].isNew = isNew(chapters[i].Date)
            chapters[i].Date = calcDateForMangaPage(chapters[i].Date);
        } else {
            chapters[i].Date = calcDateForMangaChapters(chapters[i].Date);
        }
    }
    return chapters.reverse();
}

function isNew(date) {
    var timeNow = moment(date).subtract(1, "hour");
    return moment().diff(timeNow, "hours") < 24;
}
function fixCurrentChapter(chapter, indexName) {
    chapter = JSON.parse(chapter);
    chapter.ChapterLink = indexName + calcChapterUrl(chapter.Chapter);
    chapter.Chapter = calcChapter(chapter.Chapter);
    chapter.Date = calcDateForMangaChapters(chapter.Date);
    return chapter
}
function PageImage(PageString) {
    var s = "000" + PageString;
    return s.substr(s.length - 3);
}
function chapterImgURLS(currentChapter, imageDirectoryURL, indexName) {
    var imgURLS = [];
    var chapterNumber = ChapterImage(currentChapter.Chapter.toString());
    var directory = currentChapter.Directory === '' ? '/' : '/' + currentChapter.Directory + '/'

    console.log(imageDirectoryURL)
    for (var i = 1; i < parseInt(currentChapter.Page) + 1; i++) {
        let imagePage = PageImage(i.toString());
        if (process.env['SERVERNAME'] == 'https://mangaapi.lavishkumar1.repl.co/') {
            var imageURL = '//axiostrailbaby.lavishkumar1.repl.co/sendImage/' + (imageDirectoryURL + '/manga/' + indexName + directory + chapterNumber + '-' + imagePage + '.png').replaceAll('/', ' ')
        } else {
            var imageURL = '//' + imageDirectoryURL + '/manga/' + indexName + directory + chapterNumber + '-' + imagePage + '.png'
        }
        imgURLS.push(imageURL);
    }

    return imgURLS;
}
function ChapterImage(ImageChapterToString) {
    if (ImageChapterToString.includes('.')) {
        if (ImageChapterToString.length === 5) {
            ImageChapterToString = '0' + ImageChapterToString
        } else if (ImageChapterToString.length === 4) {
            ImageChapterToString = '00' + ImageChapterToString
        } else if (ImageChapterToString.length === 3) {
            ImageChapterToString = '000' + ImageChapterToString
        }
    } else {
        if (ImageChapterToString.length === 3) {
            ImageChapterToString = '0' + ImageChapterToString
        } else if (ImageChapterToString.length === 2) {
            ImageChapterToString = '00' + ImageChapterToString
        } else if (ImageChapterToString.length === 1) {
            ImageChapterToString = '000' + ImageChapterToString
        }
    }
    return ImageChapterToString
}
async function readHtml(req, res) {

    let headers = headersGenerator.getHeaders();
    // Fetch page that we need to scrape
    const s = req.params.mangaChapter;
    let fetchUrl = 'https://letstrypup-dbalavishkumar.koyeb.app/v2?url=https://mangasee123.com/read-online/'+s+'.html';
    let fetchManga = await fetch(fetchUrl, headers)
    let resp = await fetchManga.text();
    var seriesName = resp.split(`vm.SeriesName = "`)[1].split(`";`)[0];
    var indexName = resp.split(`vm.IndexName = "`)[1].split(`";`)[0];
    var chapters = fixChaptersArry(resp.split(`vm.CHAPTERS = `)[1].split(`;`)[0], indexName);
    var currentChapter = fixCurrentChapter(resp.split(`vm.CurChapter = `)[1].split(`;`)[0], indexName);

    var imageDirectoryURL = resp.split(`vm.CurPathName = "`)[1].split(`";`)[0];
    var imageURlS = chapterImgURLS(currentChapter, imageDirectoryURL, indexName);
    currentChapter.seriesName = seriesName;
    currentChapter.indexName = indexName;
    var resps = {
        'chapters': chapters,
        'currentChapter': currentChapter,
        'imageURlS': imageURlS,
        'seriesName': seriesName,
        'indexName': indexName,
        'chapterLink': req.query.chapter
    }
    if (req.params.mangaChapter.includes('-page-')) {
        resps.title = resps.seriesName + ' Chapter ' + resps.currentChapter.Chapter + ' Page ' + '1'
    } else {
        resps.title = resps.seriesName + ' Chapter ' + resps.currentChapter.Chapter
    }
    resps.susManga = susManga;
    return res.render('read', resps)
}

function bookmarksHtml(req, res) {
    return res.render('bookmarks')
}
function scrapeMangaInfo(page) {
    const $ = cheerio.load(page)
    // list conatiner
    let mainUL = $(`ul.list-group , ul.list-group-flush`);

    let SeriesName = $(mainUL).children("li").children("h1")


    var mangaDetails = {
        'SeriesName': SeriesName.html(),
        'Info': []
    }


    $(mainUL).children("li").each(function (indx, element) {
        if (indx != 0 && indx != 1) {
            var type = $(element).text().split(`:`)[0]
            var info = $(element).text().split(`:`)[1]

            if (type.replace(/\r?\n|\r|\t/g, "") == 'Description') {
                info = $(element).text().split(`Description:`)[1].replace(/\r?\n|\r|\t/g, "");
            }

            // Have to fix description whitespace
            mangaDetails.Info.push({
                'type': type.replace(/\r?\n|\r|\t/g, ""),
                'info': info.replace(/\r?\n|\r|\t/g, "").split(`,`)
            })

        }
    })

    return mangaDetails;

    //return $(`ul.list-group , ul.list-group-flush`).html();


}
async function mangaHtml(req, res) {
    if (!isPupServerLoaded) {
        isPupServerLoaded = true;
        return res.render('loading')
    }
    let headers = headersGenerator.getHeaders();
    let mangaName = req.params.mangaName;

    if (typeof mangaName === 'undefined') {
        return res.send('manga name not given or given incorrectly')
    }
    
    let link = 'https://letstrypup-dbalavishkumar.koyeb.app/v2?url=https://mangasee123.com/manga/' + mangaName;
    let fetchManga = await fetch(link, headers);
    let resp = await fetchManga.text();

    var allData = scrapeMangaInfo(resp)
    try {
        var chapters = resp.split(`vm.Chapters = `)[1].split(`;`)[0];
    } catch (err) {
        console.log(link);
        console.log(err);
        return res.status(500).send('Page is not valid');
    }
    allData.IndexName = req.params.mangaName;
    allData.Chapters = fixChaptersArry(chapters, allData.IndexName, true);
    allData.Chapters = allData.Chapters.reverse();

    allData.susManga = susManga;
    
    return res.render('manga', allData)
}

async function directoryHtml(req, res) {
    if (!isPupServerLoaded) {
        isPupServerLoaded = true;
        return res.render('loading')
    }

    // get the directory data
    let fetchDirectoryData = await fetch(serverName + 'api/manga/directory')
    let resp = await fetchDirectoryData.json();

    return res.render('directory', {'directory' :  resp, 'susManga' : susManga })
}

async function searchHtml(req, res) {
    if (!isPupServerLoaded) {
        isPupServerLoaded = true;
        return res.render('loading')
    }

    return res.render('search')
}

async function forgotPasswordHtml(req, res) {

    let token = await isTokenValid(req.params.token, process.env.FORGOT_PASSWORD_TOKEN_SECERT);
    if (token == false) {
        return res.send('Link has expired !!');
    }
    return res.render('forgotPassword', { 'token': req.params.token })
}

async function recentChaptersHtml(req, res) {
    return res.render('recentChapters')
}

async function offlineHtml(req, res) {
    return res.render('offline')
}

async function offlineReadHtml(req, res) {
    return res.render('readOffline')
}

module.exports = {
    indexHtml,
    readHtml,
    bookmarksHtml,
    mangaHtml,
    directoryHtml,
    searchHtml,
    recentChaptersHtml,
    forgotPasswordHtml,
    offlineHtml,
    offlineReadHtml,
}
