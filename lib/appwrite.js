import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

export const config = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.bukowski.bukowski",
  projectId: "67f1fc770007cd6271af",
  storageId: "67f221480004c1e00643",
  databaseId: "67f1fc9f002e067974a4",
  userCollectionId: "67f1fcab00399a75c33e",
  videoCollectionId: "67f1fcc30010a631ace4",
};

const client = new Client();

const account = new Account(client);
const storage = new Storage(client);
const avatars = new Avatars(client);
const databases = new Databases(client);

client
  .setEndpoint(config.endpoint) // Your Appwrite Endpoint
  .setProject(config.projectId) // Your project ID
  .setPlatform(config.platform) // Your application ID or bundle ID.
  ;

// Create a new user
export async function createUser(email, password, username) {
  try {
    const userId = ID.custom(username.substring(0, 36)); // Generate a valid user ID
    const newAccount = await account.create(
      userId,
      email,
      password,
      username
    );

    if (!newAccount) throw Error;

    const avatarUrl = avatars.getInitials(username);

    await signIn(email, password);

    const newUser = await databases.createDocument(
      config.databaseId,
      config.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email: email,
        username: username,
        avatar: avatarUrl,
      }
    );

    return newUser;
  } catch (error) {
    throw new Error(error.message);
  }
}

// Sign in a user
export async function signIn(email, password) {
  try {
    const session = await account.createSession(email, password); // Use createSession instead of createEmailSession
    return session;
  } catch (error) {
    throw new Error(error.message);
  }
}
