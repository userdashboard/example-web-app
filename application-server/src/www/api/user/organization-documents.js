module.exports = {
  get: async (req) => {
    if (!req.query || !req.query.organizationid) {
      throw new Error('invalid-organizationid')
    }
    let membership
    try {
      membership = await dashboardServer.get(`/api/user/organizations/organization-membership?organizationid=${req.query.organizationid}`, req.accountid, req.sessionid)
    } catch (error) {
    }
    if (!membership) {
      throw new Error('invalid-organization')
    }
    let list
    try {
      list = await Document.listOrganization(req.query.organizationid)
    } catch (error) {
    }
    if (!list || !list.length) {
      return null
    }
    return list
  } 
 }