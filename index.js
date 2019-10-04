/*
This helper app watches the current directory for any changes to HTML files
On change, it will try to update a shopify store page whose handle matches the file name
--- Set store and access keys in .env ---
*/
require('dotenv').config({ path: __dirname + '/.env' })
const fs = require('fs').promises
const chokidar = require('chokidar')
const axios = require("axios")
const colors = require('colors')
const { DateTime } = require('luxon')

const {
  SHOPIFY_APP_KEY,
  SHOPIFY_APP_SECRET,
  SHOPIFY_STORE,
} = process.env

if (!(SHOPIFY_APP_KEY && SHOPIFY_APP_SECRET && SHOPIFY_STORE)) throw Error(`Can't read environment variables`)

const storeAccess = `https://${SHOPIFY_APP_KEY}:${SHOPIFY_APP_SECRET}@${SHOPIFY_STORE}.myshopify.com`

const watcher = chokidar.watch(`*.html`, {
  ignored: /(^|[\/\\])\../,
  awaitWriteFinish: {
    stabilityThreshold: 500,
  },
})
 
const log = console.log.bind(console)

const getTime = () => DateTime.local().setZone("America/Los_Angeles").toLocaleString(DateTime.TIME_WITH_SECONDS)

const getPageId = async (handle) => {
  const res = await axios.get(`${storeAccess}/admin/pages.json`, {
    params: {
      handle,
    }
  })

  if (res.data.pages.length) {
    return res.data.pages[0].id
  } else {
    throw Error(`Page with handle "${handle}" not found in ${SHOPIFY_STORE} store`)
  }
}

const updatePage = async (id, body_html) => {
  const res = await axios.put(`${storeAccess}/admin/pages/${id}.json`, {
    page: {
      id,
      body_html,
    }
  })
  
  if (res.status === 200) log(`<=> [${getTime()}]`.white, `success!`.green, `updated corresponding page in store`.white)
}

const processFile = async (file) => {
  try {
    const html = await fs.readFile(file, 'utf8')
    const pageId = await getPageId(file.split('.')[0])
    await updatePage(pageId, html)
    log(`*** [${getTime()}] watching`.white, process.cwd().cyan.bold, `for updates ***`.white)
  } catch (err) {
    console.error(err)
  }
}

watcher
  .on('ready', () => {
    log(`<=> <=> <=> SHOPIFY PAGE UPDATE <=> <=> <=>`.blue.bold.italic)
    log(`*** [${getTime()}] watching`.white, process.cwd().cyan.bold, `for updates ***`.white)
  })
  .on('error', error => log(`[${getTime()}] Watcher error: ${error}`.red))
  .on('change', file => {
    log(`<=> [${getTime()}]`.white, file.yellow, `has changed`.white)
    processFile(file)
  })
