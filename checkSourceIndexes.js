/////////////////////////////////////
// All parameters in this section must be properly configured for the cluster
/////////////////////////////////////
// database login
var login = "admin"
//
// database password
var password = "123"
//
// database connection parameters in formt ?tls=true&...
var params = "?tls=true"
//
/////////////////////////////////////


var clusterInfo = {
    shards : new Array(),
    indexes : new Object(),
    hosts : new Array()
};
db.adminCommand({ listShards: 1 }).shards.forEach(function(shard) {
    var shardInfo = {
        name : shard._id,
        indexes : new Object(),
        hosts : new Array()
    }
    var shardConnection = new Mongo("mongodb://"+login+":"+password+"@"+shard.host.split('/')[1]+params);
    shardConnection.setReadPref("primaryPreferred");
    shardConnection.getDB("test").adminCommand( { replSetGetStatus: 1 } ).members.forEach(function(member) {
        if (member.stateStr == "PRIMARY" || member.stateStr == "SECONDARY") {
            clusterInfo.hosts.push(member.name);
            shardInfo.hosts.push(member.name);
            var connection = new Mongo("mongodb://"+login+":"+password+"@"+member.name+params);
            connection.setReadPref("primaryPreferred");
            
            // get the indexes from all the databases
            connection.getDB("test").adminCommand({"listDatabases":1}).databases.forEach(function(mdb) {
                if (!(["config", "local", "admin"].includes(mdb.name)))
                    connection.getDB(mdb.name).getCollectionInfos().forEach(function(collection) {
                        connection.getDB(mdb.name).getCollection(collection.name).getIndexes().forEach(function(doc) {
                            delete doc.v;
                            delete doc.background;
                            doc.shard = shard._id;
                            doc.ns = mdb.name+"."+collection.name;
                            idx = doc.ns+"."+doc.name;
                            if (db.getSiblingDB(mdb.name).getCollection(collection.name).stats().sharded) {
                                //memberInfo.shardedIndexes.push(doc);
                                if (!(idx in clusterInfo.indexes))
                                    clusterInfo.indexes[idx] = {info: new Array(), hosts : new Array()}
                                clusterInfo.indexes[idx].info.push(doc)
                                clusterInfo.indexes[idx].hosts.push(member.name)
                            } else {
                                if (!(idx in shardInfo.indexes))
                                    shardInfo.indexes[idx] = {info: new Array(), hosts : new Array()}
                                shardInfo.indexes[idx].info.push(doc)
                                shardInfo.indexes[idx].hosts.push(member.name)
                            }
                        });
                    });
            });
        }
    });
    clusterInfo.shards.push(shardInfo);
});

//checking for missing indexes on sharded collections
cnt = clusterInfo.hosts.length;
for(idx in clusterInfo.indexes) {
    if (clusterInfo.indexes[idx].hosts.length != cnt) {
        print("--------------------------------------------------");
        print("Index: "+idx);
        print("Key: "+JSON.stringify(clusterInfo.indexes[idx].info[0].key));
        print("Index is missing on hosts:");
        for(host in clusterInfo.hosts) {
            hostname = clusterInfo.hosts[host];
            if (!(clusterInfo.indexes[idx].hosts.includes(hostname)))
                print(hostname);
        }
        print("--------------------------------------------------");
    }
}

//checking for missing indexes on non-sharded collections
clusterInfo.shards.forEach(function(shard) {
    cnt = shard.hosts.length;
    for(idx in shard.indexes) {
        if (shard.indexes[idx].hosts.length != cnt) {
            print("--------------------------------------------------");
            print("Index: "+idx);
            print("Key: "+JSON.stringify(shard.indexes[idx].info[0].key));
            print("Index is missing on hosts:");
            for(host in shard.hosts) {
                hostname = shard.hosts[host];
                if (!(shard.indexes[idx].hosts.includes(hostname)))
                    print(hostname);
            }
            print("--------------------------------------------------");
        }
    }
});

//checking for inconsistent indexes on sharded collections
for(idx in clusterInfo.indexes) {
    var indexBroken = false;
    var indexKey = JSON.stringify(clusterInfo.indexes[idx].info[0].key);
    clusterInfo.indexes[idx].info.forEach(function(info) {
        if(indexKey != JSON.stringify(info.key))
            indexBroken = true;
    })
    if (indexBroken) {
        print("--------------------------------------------------");
        print("Index: "+idx);
        print("Index is inconsistent over hosts:");
        for(host in clusterInfo.hosts) {
            hostname = clusterInfo.hosts[host];
            print(hostname+": "+JSON.stringify(clusterInfo.indexes[idx].info[0].key));

        }
        print("--------------------------------------------------");
    }
}

//checking for inconsistent indexes on non-sharded collections
clusterInfo.shards.forEach(function(shard) {
    for(idx in shard.indexes) {
        var indexBroken = false;
        var indexKey = JSON.stringify(shard.indexes[idx].info[0].key);
        shard.indexes[idx].info.forEach(function(info) {
            if(indexKey != JSON.stringify(info.key))
                indexBroken = true;
        })
        if (indexBroken) {
            print("--------------------------------------------------");
            print("Index: "+idx);
            print("Index is inconsistent over hosts:");
            for(host in shard.hosts) {
                hostname = shard.hosts[host];
                print(hostname+": "+JSON.stringify(shard.indexes[idx].info[0].key));

            }
            print("--------------------------------------------------");
        }
    }
});