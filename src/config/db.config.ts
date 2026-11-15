const dbConfig = {
  // Lazy getter: reads process.env.MONGO_URI on every access.
  get url(): string {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    return uri;
  }
};

export default dbConfig;
