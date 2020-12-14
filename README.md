# MongoDB useful scripts

### RS manual failover reconfig:
```javascript
var st = rs.status();
var cfg = rs.config();
st.members.forEach(s=>{if(s.health == 0) { for (var i=0;i<cfg.members.length;i++) { if(cfg.members[i]._id==s._id) {cfg.members[i].votes=0;cfg.members[i].priority=0;}}}});
rs.reconfig(cfg, {force:true});
```

### Show full instance index usage statistics:
```javascript
db.adminCommand({listDatabases:1}).databases.forEach(function(dd) {if (!Array.contains(["admin","local","config"], dd.name)) { var d = db.getSiblingDB(dd.name); d.getCollectionInfos().forEach(function(c) {if(c.type == 'collection') {var res = d.getCollection(c.name).aggregate([{$indexStats:{}}, {"$project":{name:"$name",ops:"$accesses.ops", since:"$accesses.since"}}]); while(res.hasNext()) {var r=res.next(); if (r.name != "_id_") {print("'"+d+"'.'"+c.name+"'.'"+r.name+"': ops="+r.ops+", since="+r.since)}}}})}})
```

### Random sample data generator
```javascript
for(var i = 0; i <= 1000; i++) {
    var elemId = Math.ceil(Math.random()*1000)+1;
    for(var j = 0; j <= Math.ceil(Math.random()*1000)+200; j++) {
        var dt = new Date(Date.now() - (Math.ceil(Math.random() * 1000 * 60 * 60 * 24*1000)));
        var value = (Math.random()+1).toString(36).substring(2);
        db.test.insertOne({"elemId":elemId, "dt":dt, "value":value})
    }
}
```

### Export all indexes
```javascript
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
```
