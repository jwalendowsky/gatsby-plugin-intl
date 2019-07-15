const webpack = require("webpack")

function flattenMessages(nestedMessages, prefix = "") {
  return Object.keys(nestedMessages).reduce((messages, key) => {
    let value = nestedMessages[key]
    let prefixedKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === "string") {
      messages[prefixedKey] = value
    } else {
      Object.assign(messages, flattenMessages(value, prefixedKey))
    }

    return messages
  }, {})
}

exports.onCreateWebpackConfig = ({ actions, plugins }, pluginOptions) => {
  const { redirectComponent = null, languages, defaultLanguage } = pluginOptions
  if (!languages.includes(defaultLanguage)) {
    languages.push(defaultLanguage)
  }
  const regex = new RegExp(languages.map(l => l.split("-")[0]).join("|"))
  actions.setWebpackConfig({
    plugins: [
      plugins.define({
        GATSBY_INTL_REDIRECT_COMPONENT_PATH: JSON.stringify(redirectComponent),
      }),
      new webpack.ContextReplacementPlugin(
        /react-intl[/\\]locale-data$/,
        regex
      ),
    ],
  })
}

const allSitePage = []

exports.onCreatePage = async ({ page, actions }, pluginOptions) => {
  const { createPage, deletePage } = actions
  const {
    path = ".",
    languages = ["en"],
    defaultLanguage = "en",
    redirect = false,
  } = pluginOptions

  const getMessages = (path, language) => {
    try {
      // TODO load yaml here
      const messages = require(`${path}/${language}.json`)
      //
      return flattenMessages(messages)
    } catch (err) {
      return {}
    }
  }

  const generatePage = (routed, language) => {
    const messages = getMessages(path, language)
    const path = messages[`routes.${page.path}`] || page.path
    const newPath = routed ? `/${language}${path}` : path
    allSitePage.push(newPath)
    return {
      ...page,
      path: newPath,
      context: {
        ...page.context,
        intl: {
          language,
          languages,
          messages,
          routed,
          originalPath: page.path,
          redirect,
          allSitePage,
        },
      },
    }
  }

  const newPage = generatePage(false, defaultLanguage)
  deletePage(page)
  createPage(newPage)

  languages.forEach(language => {
    const localePage = generatePage(true, language)
    createPage(localePage)
  })
}
