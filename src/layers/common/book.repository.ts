import { DynamoDB, Endpoint } from 'aws-sdk';
import { NotFound } from 'http-errors';
import { v4 as uuid } from 'uuid';

import Book from './definitions/book.interface';
import Errors from './definitions/errors.enum';
import { dynamoDBErrorHandler } from './utils';

const dynamodb: DynamoDB.DocumentClient = new DynamoDB.DocumentClient({
    endpoint: process.env.NODE_ENV === 'local' ? new Endpoint('http://dynamodb:8000') : undefined,
    region: 'us-east-1',
    httpOptions: {
        timeout: 20000
    }
});

const TABLE_NAME = 'Books';

export const create = (book: Book): Promise<Book> => {
    return new Promise((resolve, reject) => {
        const params: DynamoDB.DocumentClient.UpdateItemInput = {
            TableName: TABLE_NAME,
            Key: { bookId: uuid() },
            UpdateExpression: `set title = :t, genre = :g, author = :a`,
            ExpressionAttributeValues: {
                ':t': book.title,
                ':g': book.genre,
                ':a': book.author
            },
            ReturnValues: 'ALL_NEW'
        };
        dynamodb
            .update(params)
            .promise()
            .then((data: DynamoDB.DocumentClient.UpdateItemOutput) => {
                const createdBook: Book = {
                    id: data.Attributes.bookId,
                    title: data.Attributes.title,
                    genre: data.Attributes.genre,
                    author: data.Attributes.author
                };
                resolve(createdBook);
            })
            .catch((err: AWS.AWSError) => {
                reject(dynamoDBErrorHandler(err));
            });
    });
};

export const findOne = (id: string): Promise<Book> => {
    return new Promise((resolve, reject) => {
        const params: DynamoDB.DocumentClient.GetItemInput = {
            Key: {
                bookId: id
            },
            TableName: TABLE_NAME
        };
        dynamodb
            .get(params)
            .promise()
            .then((data: DynamoDB.DocumentClient.GetItemOutput) => {
                if (data.Item) {
                    const book: Book = {
                        id: data.Item.bookId,
                        title: data.Item.title,
                        genre: data.Item.genre,
                        author: data.Item.author
                    };
                    resolve(book);
                } else {
                    reject(new NotFound(Errors.NOT_FOUND));
                }
            })
            .catch((err: AWS.AWSError) => {
                reject(dynamoDBErrorHandler(err));
            });
    });
};

export const find = (): Promise<Book[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const params: DynamoDB.DocumentClient.ScanInput = {
                TableName: TABLE_NAME,
                ExclusiveStartKey: undefined
            };
            const scanResults: DynamoDB.DocumentClient.ItemList = [];
            let items: DynamoDB.DocumentClient.ScanOutput;
            do {
                items = await dynamodb.scan(params).promise();
                items.Items.forEach((item) => scanResults.push(item));
                params.ExclusiveStartKey = items.LastEvaluatedKey;
            } while (typeof items.LastEvaluatedKey !== 'undefined');
            const books: Book[] = scanResults.map((item: DynamoDB.DocumentClient.AttributeMap) => {
                const book: Book = {
                    id: item.bookId,
                    title: item.title,
                    genre: item.genre,
                    author: item.author
                };
                return book;
            });
            resolve(books);
        } catch (err) {
            reject(dynamoDBErrorHandler(err));
        }
    });
};

export const update = (id: string, book: Book): Promise<Book> => {
    return new Promise(async (resolve, reject) => {
        try {
            await findOne(id);
        } catch (err) {
            return reject(err);
        }
        const params: DynamoDB.DocumentClient.UpdateItemInput = {
            TableName: TABLE_NAME,
            Key: { bookId: id },
            UpdateExpression: `set title = :t, genre = :g, author = :a`,
            ExpressionAttributeValues: {
                ':t': book.title,
                ':g': book.genre,
                ':a': book.author
            },
            ReturnValues: 'ALL_NEW'
        };
        dynamodb
            .update(params)
            .promise()
            .then((data: DynamoDB.DocumentClient.UpdateItemOutput) => {
                const updatedBook: Book = {
                    id: data.Attributes.bookId,
                    title: data.Attributes.title,
                    genre: data.Attributes.genre,
                    author: data.Attributes.author
                };
                resolve(updatedBook);
            })
            .catch((err: AWS.AWSError) => {
                reject(dynamoDBErrorHandler(err));
            });
    });
};

export const remove = (id: string): Promise<null> => {
    return new Promise(async (resolve, reject) => {
        try {
            await findOne(id);
        } catch (err) {
            return reject(err);
        }
        const params: DynamoDB.DocumentClient.DeleteItemInput = {
            TableName: TABLE_NAME,
            Key: { bookId: id }
        };
        dynamodb
            .delete(params)
            .promise()
            .then(() => {
                resolve(null);
            })
            .catch((err: AWS.AWSError) => {
                reject(dynamoDBErrorHandler(err));
            });
    });
};
