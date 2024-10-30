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

var printHeader = function(title) {
  print("\n")
  print("---------------------");
  print(title);
  print("---------------------");
  print(
    [
      "Namespace",
      "Total Documents",
      "Average Document Size",
      "Total Documents Size",
      "Total Storage Size",
      "Reusable from Collections",
      "Indexes",
      "Reusable from Indexes",
      "Total Orphan Documents",
    ].join(",")
  );
}

var printTotals = function(title, totals) {
  print(
    [
      `${title} Total`,
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
}

var getData = function (name, shard, stats) {
  var data = {
    name: name,
    shard: shard,
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

      if (stats.hasOwnProperty("sharded")) {
        var keys = Object.keys(stats.shards);
        if (keys.length == 0) {
          result.push(getData(stats.ns, stats));
        } else {
          for (var i in keys) {
            var shard = keys[i];
            var shardStats = stats.shards[shard];
            result.push(getData(stats.ns + " (" + shard + ")", shard, shardStats));
          }
        }
      }
    });

  var totals = [Number(0), Number(0), Number(0), Number(0), Number(0)];
  var shards = {}

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

    if (shards.hasOwnProperty[row.shard]) {
      var shardsTotal = shards[row.shard];
    } else {
      var shardsTotal = [Number(0), Number(0), Number(0), Number(0), Number(0)];
    }
    shardsTotal[0] += row.size;
    shardsTotal[1] += row.storageSize;
    shardsTotal[2] += row.reusableSpace;
    shardsTotal[3] += row.indexSpace;
    shardsTotal[4] += row.indexReusable;

    shards[row.shard] = shardsTotal;
  }
  return {totals: totals, shards: shards};
};

var ignoreList = ["admin", "local", "config"];

var clusterTotal = [Number(0), Number(0), Number(0), Number(0), Number(0)];
var shards = {};

db.getMongo()
  .getDBNames()
  .forEach(function (databaseName) {
    if (ignoreList.indexOf(databaseName) < 0) {
      printHeader(databaseName);
      var result = getDataPerDatabase(databaseName);
      printTotals(`Database: ${databaseName}`, result.totals);
      clusterTotal[0] += result.totals[0];
      clusterTotal[1] += result.totals[1];
      clusterTotal[2] += result.totals[2];
      clusterTotal[3] += result.totals[3];
      clusterTotal[4] += result.totals[4];

      var keys = Object.keys(result.shards);
      for (i in keys) {
        var shard = keys[i];
        if (shards[shard]) {
          var shardsTotal = shards[shard];
        } else {
          var shardsTotal = [Number(0), Number(0), Number(0), Number(0), Number(0)];
        }
        shardsTotal[0] += result.shards[shard][0];
        shardsTotal[1] += result.shards[shard][1];
        shardsTotal[2] += result.shards[shard][2];
        shardsTotal[3] += result.shards[shard][3];
        shardsTotal[4] += result.shards[shard][4];

        shards[shard] = shardsTotal;
      }
    }
  });

printHeader("Cluster Total");
var keys = Object.keys(shards);
for (i in keys) {
  var shard = keys[i];
  printTotals(shard, shards[shard]);
}
printTotals("Cluster", clusterTotal);