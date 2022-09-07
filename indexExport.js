var ignoreKeys = ["v", "key", "name", "ns", "safe", "force"];
var ignoreDBs = ["admin","local","config"];
var ignoreIndexes = ['{"_id":1}'];
var dbs = db.getMongo().getDBs().databases.filter(function(dbb) {
    return !Array.contains(ignoreDBs, dbb.name)
});
dbs.forEach(function(dbData) {
    var name = dbData.name;
    var database = db.getSiblingDB(name);
    var collections = database.getCollectionNames();
    collections.forEach(function(collectionName){
        var collection = database.getCollection(collectionName)
        var indexes = collection.getIndexes().filter(function(index) {
            return !Array.contains(ignoreIndexes, JSON.stringify(index.key))
        });
        indexes.forEach(function(index) {
            var options = { "background": "true" };
            var keys = Object.keys(index).filter(function(key) {
                return !Array.contains(ignoreKeys, key)
            });
            keys.forEach(function(key) {
                options[key] = index[key]
            });
            print('db.getSiblingDB("'+name+'").getCollection("'+collectionName+'").createIndex(' + JSON.stringify(index.key) + ',' + JSON.stringify(options) + ")");
        })
    })
});
