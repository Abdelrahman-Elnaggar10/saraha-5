export default class BaseRepository {
    constructor(model) {
        this.model = model;
    }

    createDocument(data) {
        return this.model.create(data);
    }

    findDocumentById(_id) {
        return this.model.findById(_id);
    }

    findDocuments(filters = {}) {
        return this.model.find(filters);
    }

    findOneDocument(filters = {}) {
        return this.model.findOne(filters);
    }

    findOneAndUpdateDocument(filters, updates, options = {}) {
        return this.model.findOneAndUpdate(
            filters,
            updates,
            options
        );
    }

    findDocumentByIdAndUpdate(_id, updates, options = {}) {
        return this.model.findByIdAndUpdate(
            _id,
            updates,
            options
        );
    }

    findDocumentByIdAndDelete(_id) {
        return this.model.findByIdAndDelete(_id);
    }
}