/////////////////////////////////////
// 
// This script make sure the destination cluster indexes match the source cluster
//
// All parameters in this section must be properly configured for the cluster
// 
/////////////////////////////////////
// Source cluster connection string
var src_cluster = "mongodb+srv://admin:123@test1.iijwc.mongodb.net/?retryWrites=true&w=majority"
//
// Sestination cluster connection string
var dest_cluster = "mongodb+srv://admin:123@test2.iijwc.mongodb.net/?retryWrites=true&w=majority"
//
/////////////////////////////////////

var srcConnection = new Mongo(src_cluster);
var destConnection = new Mongo(dest_cluster);

// Checkin that all indexes from the source cluster exist on the destination cluster
srcConnection.getDB("test").adminCommand({"listDatabases":1}).databases.forEach(function(mdb) {
    if (!(["config", "local", "admin"].includes(mdb.name))) 
        srcConnection.getDB(mdb.name).getCollectionInfos().forEach(function(collection) {
            srcConnection.getDB(mdb.name).getCollection(collection.name).getIndexes().forEach(function(src_doc) {
                delete src_doc.v;
                delete src_doc.background;
                src_json = JSON.stringify(src_doc);
                indexFound = false;
                destConnection.getDB(mdb.name).getCollection(collection.name).getIndexes().forEach(function(dest_doc){
                    delete dest_doc.v;
                    delete dest_doc.background;
                    dest_json = JSON.stringify(dest_doc);
                    if (src_json === dest_json)
                        indexFound = true;
                });
                if(!indexFound) {
                    print('Missing index '+ mdb.name + "." + collection.name + "." + src_doc.name + ": " + src_json);
                }
            });
        });
});

// Validating all sharded collections from source cluster use the same shard key on the destination cluster
srcConnection.getDB("config").getCollection("collections").find({"dropped":false}, {_id:1, key:1, unique:1}).forEach(function(src_doc){
    dest_doc = destConnection.getDB("config").getCollection("collections").findOne({"_id" : src_doc._id}, {_id:1, key:1, unique:1});
    if (dest_doc==null) {
        print("Missing sharding for collection: " + src_doc._id);
    } else if (JSON.stringify(src_doc) != JSON.stringify(dest_doc)) {
        print("===Mismatch in sharding=== " + src_doc._id);
        print("Source: " + JSON.stringify(src_doc));
        print("Destination: " + JSON.stringify(dest_doc));
    }
});