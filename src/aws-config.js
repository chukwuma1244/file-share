const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_dkPsBnWjH",
      userPoolClientId: "6q4fis925r8qcnsoeqfkvigupv",
      loginWith: {
        username: true,
        email: true,
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: "https://mjcytmaaerbsbclgbdfwwb5hei.appsync-api.us-east-1.amazonaws.com/graphql",
      region: "us-east-1",
      defaultAuthMode: "userPool",
    },
  },

  Storage: {
    S3: {
        bucket: 'filesharebucket321',
        region: 'us-east-1'
    }
  }
}

export default awsConfig
