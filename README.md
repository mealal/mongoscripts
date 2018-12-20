# MongoDB useful scripts

### Show full instance index usage statistics:
```javascript
db.adminCommand({listDatabases:1}).databases.forEach(function(dd) {var d = db.getSiblingDB(dd.name); d.getCollectionNames().forEach(function(c) {var res = d.getCollection(c).aggregate([{$indexStats:{}}, {"$project":{name:"$name",ops:"$accesses.ops", since:"$accesses.since"}}]); while(res.hasNext()) {var r=res.next(); print("'"+d+"'.'"+c+"'.'"+r.name+"': ops="+r.ops+", since="+r.since)}})})
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
