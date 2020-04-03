module.exports = {
  get: async (req) => {
    const whois = {
      accountid: req.accountid,
      sessionid: req.sessionid
    }
    const organizations = await dashboardServer.get(`/api/user/organizations/organizations?accountid=${req.accountid}&all=true`, req.accountid, req.sessionid)
    if (organizations && organizations.length) {
      whois.organizations = organizations
    }
    return whois
  }
}