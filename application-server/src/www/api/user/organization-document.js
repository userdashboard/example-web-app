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
    if (!result.organizationid) {
      throw new Error('invalid-document')
    }
    let membership
    try {
      membership = await dashboardServer.get(`/api/user/organizations/organization-membership?organizationid=${result.organizationid}`, req.accountid, req.sessionid)
    } catch (error ){
    }
    if (!membership) {
      throw new Error('invalid-document')
    }
    return result
  }
}