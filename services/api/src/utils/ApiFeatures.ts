export class APIFeatures {
  queryString: any;
  query: any;
  constructor(query: any, queryString: any) {
    this.query = query;
    this.queryString = queryString;
  }

  sort() {
    if (this.queryString.sort && typeof this.queryString.sort == "string") {
      this.query = this.query.sort(this.queryString.sort);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields && typeof this.queryString.fields == "string") {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate() {
    if (
      this.queryString.page &&
      this.queryString.limit &&
      typeof this.queryString.page === "string" &&
      typeof this.queryString.limit === "string"
    ) {
      const page = parseInt(this.queryString.page) || 1;
      const limit = parseInt(this.queryString.limit) || 100;
      const skip = (page - 1) * limit;

      console.log("pageination");
      this.query = this.query.skip(skip).limit(limit);
    }
    return this;
  }
}
