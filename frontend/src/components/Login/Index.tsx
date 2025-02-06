import { useAuth0 } from '@auth0/auth0-react';
import { Button, Flex, Typography } from '@neo4j-ndl/react';

export default function Login() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className='ng-bg-palette-neutral-bg-default'>
      <div className='flex flex-col p-4 n-bg-palette-neutral-bg-weak n-rounded-lg gap-4'>
        <Flex flexDirection='column' gap='4' alignItems='center'>
          <Typography variant='body-medium'>
            It seems like you haven't ingested any data yet. To begin building your knowledge graph, you'll need to log
            in to the main application.
          </Typography>
        </Flex>
        <div className='flex justify-center items-center'>
          <Button
            size='large'
            onClick={() => {
              loginWithRedirect();
            }}
          >
            Login with Neo4j
          </Button>
        </div>
      </div>
    </div>
  );
}
