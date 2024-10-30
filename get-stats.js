/*
 * Gathers total cluster details about used disk space
 *
 * @author alexey.menshikov@mongodb.com
 * @version 1.0
 * @updated 2024-10-23
 *
 * History:
 * 1.0 - Initial Release
 */

var getNumber = function (val) {
  return val ? new Number(val) : new Number(0);
};

var formatBytes = function (bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

var getData = function (name, stats) {
  var data = {
    name: name,
    count: getNumber(stats.count),
    avgSize: getNumber(stats.avgObjSize),
    size: getNumber(stats.size),
    storageSize: getNumber(stats.storageSize),
    reusableSpace: getNumber(
      stats.wiredTiger["block-manager"]["file bytes available for reuse"]
    ),
    indexSpace: getNumber(stats.totalIndexSize),
    indexReusable: 0,
    orphanDocuments: getNumber(stats.numOrphanDocs)
  };

  var keys = Object.keys(stats.indexDetails);
  for (var k in keys) {
    data.indexReusable += getNumber(
      stats.indexDetails[keys[k]]["block-manager"]["file bytes available for reuse"]
    );
  }

  return data;
};

var getDataPerDatabase = function (databaseName) {
  var result = [];

  db.getSiblingDB(databaseName)
    .getCollectionInfos({ type: "collection" }, { nameOnly: true })
    .forEach(function (collectionData) {
      var coll = db
        .getSiblingDB(databaseName)
        .getCollection(collectionData.name);

      var stats = coll.stats({
        indexDetails: true,
      });

      if (stats.hasOwnProperty("sharded") && stats.sharded) {
        var keys = Object.keys(stats.shards);
        for (var i in keys) {
          var shard = keys[i];
          var shardStats = stats.shards[shard];
          result.push(getData(stats.ns + " (" + shard + ")", shardStats));
        }
      } else {
        result.push(getData(stats.ns, stats));
      }
    });

  var totals = [Number(0), Number(0), Number(0), Number(0), Number(0)];

  for (var r in result) {
    var row = result[r];
    print(
      [
        row.name,
        row.count,
        row.avgSize,
        formatBytes(row.size),
        formatBytes(row.storageSize),
        formatBytes(row.reusableSpace),
        formatBytes(row.indexSpace),
        formatBytes(row.indexReusable),
        row.orphanDocuments
      ].join(",")
    );

    totals[0] += row.size;
    totals[1] += row.storageSize;
    totals[2] += row.reusableSpace;
    totals[3] += row.indexSpace;
    totals[4] += row.indexReusable;
  }
  return totals;
};

var ignoreList = ["admin", "local", "config"];

var clusterTotal = [Number(0), Number(0), Number(0), Number(0), Number(0)];

db.getMongo()
  .getDBNames()
  .forEach(function (databaseName) {
    if (ignoreList.indexOf(databaseName) < 0) {
      print("---------------------");
      print(databaseName);
      print("---------------------");
      print(
        [
          "Namespace",
          "Total Documents",
          "Average Document Size",
          "Uncompressed",
          "Compressed",
          "Reusable from Collections",
          "Indexes",
          "Reusable from Indexes",
          "Orphan Documents",
        ].join(",")
      );
      totals = getDataPerDatabase(databaseName);
      print(
        [
          `Database: ${databaseName} Total`,
          "",
          "",
          formatBytes(totals[0]),
          formatBytes(totals[1]),
          formatBytes(totals[2]),
          formatBytes(totals[3]),
          formatBytes(totals[4]),
          ""
        ].join(",")
      );
      clusterTotal[0] += totals[0];
      clusterTotal[1] += totals[1];
      clusterTotal[2] += totals[2];
      clusterTotal[3] += totals[3];
      clusterTotal[4] += totals[4];
    }
  });

  print("---------------------");
  print("Cluster Total");
  print("---------------------");
print(
  [
    "Namespace",
    "Total Documents",
    "Average Document Size",
    "Uncompressed",
    "Compressed",
    "Reusable from Collections",
    "Indexes",
    "Reusable from Indexes",
    "Orphan Documents",
  ].join(",")
);
print(
  [
    "Total",
    "",
    "",
    formatBytes(clusterTotal[0]),
    formatBytes(clusterTotal[1]),
    formatBytes(clusterTotal[2]),
    formatBytes(clusterTotal[3]),
    formatBytes(clusterTotal[4]),
    "",
  ].join(",")
);
