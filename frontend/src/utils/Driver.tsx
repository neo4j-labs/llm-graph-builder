import neo4j, { Driver } from 'neo4j-driver';

export const initialiseDriver = async (connectionURI: string, username: string, password: string) => {
  try {
    const driver: Driver = neo4j.driver(connectionURI, neo4j.auth.basic(username, password));
    const serverInfo = await driver.getServerInfo();
    console.log(serverInfo);
    localStorage.setItem('password', password);
    return driver;
  } catch (err: any) {
    console.error(`Connection error\n${err}\nCause: ${err.cause}`);
    return err.message;
  }
};
