import * as aws from "@pulumi/aws";
import * as dynamodb from "@aws-sdk/client-dynamodb";

const bucket = new aws.s3.Bucket("dynamodb-indexed-bucket", {
  forceDestroy: true,
});

const tableName = "s3-object-key-index";
const dbTable = new aws.dynamodb.Table("bucket-index", {
  name: tableName,
  attributes: [
    {
      name: "S3ObjectKey",
      type: "S",
    },
  ],
  hashKey: "S3ObjectKey",
  readCapacity: 10,
  writeCapacity: 10,
});

bucket.onObjectCreated("upload-handler", async (event: aws.s3.BucketEvent) => {
  const dynamoClient = new dynamodb.DynamoDBClient();

  if (event.Records !== undefined) {
    await Promise.all(
      event.Records.map(async (ev) => {
        const cmd = new dynamodb.PutItemCommand({
          TableName: tableName,
          Item: {
            S3ObjectKey: { S: ev.s3.object.key },
          },
        });

        await dynamoClient.send(cmd);
        console.log(`created item ${ev.s3.object.key}`);
      })
    );
  }
});

bucket.onObjectRemoved("delete-handler", async (event: aws.s3.BucketEvent) => {
  const dynamoClient = new dynamodb.DynamoDBClient();

  if (event.Records) {
    await Promise.all(
      event.Records.map(async (ev) => {
        const cmd = new dynamodb.DeleteItemCommand({
          TableName: tableName,
          Key: {
            S3ObjectKey: { S: ev.s3.object.key },
          },
        });

        await dynamoClient.send(cmd);
        console.log(`deleted item ${ev.s3.object.key}`);
      })
    );
  }
});
