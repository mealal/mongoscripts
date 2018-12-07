# MongoDB useful scripts

### Show full instance index usage statistics:
```javascript
db.adminCommand({listDatabases:1}).databases.forEach(function(dd) {var d = db.getSiblingDB(dd.name); d.getCollectionNames().forEach(function(c) {var res = d.getCollection(c).aggregate([{$indexStats:{}}, {"$project":{name:"$name",ops:"$accesses.ops", since:"$accesses.since"}}]); if(res.hasNext()) {var r=res.toArray()[0]; print("'"+d+"'.'"+c+"'.'"+r.name+"': ops="+r.ops+", since="+r.since)}})})
```
