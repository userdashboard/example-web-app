module.exports = {
  get: async (req) => {
    if (!req.query || !req.query.documentid) {
      throw new Error('invalid-documentid')
    }
    let result
    try {
      result = await Document.load(req.query.documentid)
    } catch (error) {
    }
    if (!result) {
      throw new Error('invalid-documentid')
    }
    if (req.accountid !== result.accountid) {
      throw new Error('invalid-document')
    }
    return result
  }
}