import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver;

export const setDriver = async (connectionURI: string, username: string, password: string, database?: string, selectedProtocol?: string) => {
  try {
    driver = neo4j.driver(connectionURI, neo4j.auth.basic(username, password));
    const serverInfo = await driver.getServerInfo();
    console.log(serverInfo);
    localStorage.setItem(
      'neo4j.connection',
      JSON.stringify({ uri: connectionURI, user: username, password: password, database: database, selectedProtocol:selectedProtocol })
    );
    return true;
  } catch (err: any) {
    console.error(`Connection error\n${err}\nCause: ${err.cause}`);
    return false;
  }
};

export async function disconnect() {
  try {
    driver.close();
    return true;
  } catch (err: any) {
    console.error(`Disconnection error\n${err}\nCause: ${err.cause}`);
    return false;
  }
}
