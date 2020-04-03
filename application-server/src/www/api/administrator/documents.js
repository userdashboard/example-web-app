module.exports = {
 get: async (req) => {
  let list
  try {
    list = await Document.list(req.accountid)
  } catch (error) {
  }
  if (!list || !list.length) {
    return null
  }
  return list
 } 
}