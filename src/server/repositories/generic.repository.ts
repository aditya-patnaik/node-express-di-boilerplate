import { inject, injectable, unmanaged } from "inversify"
import { Schema, Document, Model, SchemaDefinition } from "mongoose"
import { Repository, Query } from "../interfaces/repositories";
import { DbClient } from "../clients/DBClient";
import TYPES from "../constants/types";

@injectable()
export class GenericRepository<TEntity, TModel extends Document>
    implements Repository<TEntity> {
        
        private _name: string;
        protected Model: Model<TModel>;

        public constructor (
            @inject(TYPES.DBClient) dbClient: DbClient,
            @unmanaged() name: string,
            @unmanaged() schemaDefinition: SchemaDefinition
        ) {
            this._name = name;
            const schema = new Schema(schemaDefinition, { collection: this._name });
            this.Model = dbClient.model<TModel>(this._name, schema);
        }

        // We wrap the mongoose API here so we can use async / await

        public async findAll() {
            return new Promise<TEntity[]>((resolve, reject) => {
                this.Model.find((err, res) => {
                    if (err) {
                        reject(err);
                    }
                    const result = res.map((r) => this._readMapper(r));
                    resolve(result);
                });
            });
        }

        public async findById(id: string) {
            return new Promise<TEntity>((resolve, reject) => {
                this.Model.findById(id, (err: any, res: any) => {
                    if (err) {
                        reject(err);
                    }
                    if (res === null) {
                        reject();
                    } else {
                        const result = this._readMapper(res);
                        resolve(result);
                    }
                });
            });
        }

        public async save(doc: TEntity) {
            return new Promise<TEntity>((resolve, reject) => {
                const instance = new this.Model(doc);
                instance.save((err, res) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(this._readMapper(res));
                });
            });
        }

        public findManyById(ids: string[]) {
            return new Promise<TEntity[]>((resolve, reject) => {
                const query = { _id: { $in : ids } };
                // @ts-ignore
                this.Model.find(query, (err: any, res: any) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(res.map((r: any) => this._readMapper(r)));
                });
            });
        }

        public findManyByQuery(
            query: Query<TEntity>,
        ) {
            return new Promise<TEntity[]>((resolve, reject) => {
                this.Model.find(query as any, (err, res) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(res.map((r) => this._readMapper(r)));
                });
            });
        }

        private _readMapper(model: TModel) {
            const obj: any = model.toJSON();
            Object.defineProperty(obj, "id", Object.getOwnPropertyDescriptor(obj, "_id"));
            delete obj["_id"];
            return obj as TEntity;
        }

}