import mongoose from "mongoose";

const connectDb = async () => {

    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database connected successfully");
    console.log({
        ConnectedToHost: connectionInstance.connections[0].host,
        Port: connectionInstance.connections[0].port,
        Name: connectionInstance.connections[0].name, 
    });


}

export default connectDb;