'use strict';
const db = uniCloud.database();
const collectionName = 'scripts';

/**
 * Debug cloud function to test search functionality
 * event: { action, searchTerm }
 */
exports.main = async (event, context) => {
  const { action = 'search', searchTerm = '暗流' } = event || {};

  console.log('=== Debug Search Function ===');
  console.log('Action:', action);
  console.log('Search term:', searchTerm);

  try {
    const coll = db.collection(collectionName);

    if (action === 'search') {
      // Test search functionality
      console.log('Testing search for:', searchTerm);

      // 1. Direct query for exact title match
      const exactTitleRes = await coll.where({
        title: searchTerm
      }).get();
      console.log('Exact title match result:', exactTitleRes);

      // 2. MongoDB regex search for title (new approach)
      const mongoRegexTitleRes = await coll.where({
        title: { $regex: searchTerm, $options: 'i' }
      }).get();
      console.log('MongoDB regex title match result:', mongoRegexTitleRes);

      // 3. JavaScript RegExp search for title (old approach)
      const jsRegexTitleRes = await coll.where({
        title: new RegExp(searchTerm, 'i')
      }).get();
      console.log('JS RegExp title match result:', jsRegexTitleRes);

      // 4. MongoDB regex search for author
      const mongoRegexAuthorRes = await coll.where({
        author: { $regex: searchTerm, $options: 'i' }
      }).get();
      console.log('MongoDB regex author match result:', mongoRegexAuthorRes);

      // 5. General search using $or (same as updated listScripts)
      const generalSearchRes = await coll.where({
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { author: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      }).get();
      console.log('General search result (updated):', generalSearchRes);

      // 5. Get all records containing "暗" character
      const containsAnRes = await coll.where({
        title: new RegExp('暗', 'i')
      }).get();
      console.log('Records containing "暗":', containsAnRes);

      return {
        code: 0,
        message: 'Debug search completed',
        results: {
          exactTitle: exactTitleRes,
          regexTitle: regexTitleRes,
          regexAuthor: regexAuthorRes,
          generalSearch: generalSearchRes,
          containsAn: containsAnRes
        }
      };

    } else if (action === 'list') {
      // List all records for inspection
      const allRecords = await coll.limit(50).get();
      console.log('All records (first 50):', allRecords);

      return {
        code: 0,
        message: 'All records retrieved',
        data: allRecords.data,
        total: allRecords.data ? allRecords.data.length : 0
      };

    } else if (action === 'count') {
      // Count total records
      const countRes = await coll.count();
      console.log('Total count:', countRes);

      return {
        code: 0,
        message: 'Count completed',
        total: countRes.total
      };
    }

  } catch (error) {
    console.error('Debug search error:', error);
    return {
      code: -1,
      message: error.message,
      error: error
    };
  }
};