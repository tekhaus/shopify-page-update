/*
This helper app watches the current directory for any changes to HTML files
On change, it will try to update a shopify store page whose handle matches the file name
--- Set store and access keys in .env ---
*/
require('dotenv').config({ path: __dirname + '/.env' })
const fs = require('fs').promises
const chokidar = require('chokidar')
const axios = require("axios")

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

watcher
  .on('ready', () => log(`SHOPIFY PAGE UPDATE running... watching ${process.cwd()} for updates`))
  .on('error', error => log(`Watcher error: ${error}`))
  .on('change', file => {
    log(`File ${file} has been changed`)
    processFile(file)
  })

async function getPageId (handle) {
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

async function updatePage (id, body_html) {
  const res = await axios.put(`${storeAccess}/admin/pages/${id}.json`, {
    page: {
      id,
      body_html,
    }
  })
  
  if (res.status === 200) log(`...successfully updated corresponding page in store`)
}

async function processFile(file) {
  try {
    const html = await fs.readFile(file, 'utf8')
    const pageId = await getPageId(file.split('.')[0])
    await updatePage(pageId, html)
  } catch (err) {
    console.error(err)
  }
}
