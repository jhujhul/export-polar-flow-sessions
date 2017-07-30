// Set jar to true to enable cookies, it will remember cookies for future use
const request = require('request').defaults({ jar: true });
const fs = require('fs');
const argv = require('yargs')
  .usage(
    'Usage: node $0 --email=[string] --password=[string] --start=[string] --end=[string] --format=[string]'
  )
  .describe('email', 'Your Polar Flow email')
  .describe('password', 'Your Polar Flow password')
  .describe('start', 'The start date of the export (default: 1.7.2017)')
  .describe('end', 'The end date of the export (default: today)')
  .describe(
    'format',
    'The format of the exported files, possible values: tcx / csv / gpx (default: tcx)'
  )
  .demandOption(['email', 'password'])
  .example(
    'node $0 --email=my@email.com --password=myPassword --start=26.06.2017 --end=30.07.2017 --format=csv'
  ).argv;
var pjson = require('./package.json');

const USER_AGENT = `${pjson.name} / ${pjson.version}`;

const login = (email, password) => {
  console.log('Loging in');

  const promise = new Promise((resolve, reject) => {
    // Send an URL-Encoded Forms request
    // https://github.com/request/request#forms
    request.post(
      {
        url: 'https://flow.polar.com/login',
        form: {
          returnUrl: '/',
          email: email,
          password: password
        }
      },
      (err, response, body) => {
        // The api redirects if login is successful
        if (err || response.statusCode !== 303) {
          console.log('Login error');
          return reject(body);
        }

        console.log('Login successful');
        resolve();
      }
    );
  });

  return promise;
};

const getTrainingSessionsList = (startDate, endDate) => {
  console.log('Getting training sessions list');

  var promise = new Promise((resolve, reject) => {
    request(
      {
        uri: `https://flow.polar.com/training/getCalendarEvents?start=${startDate}&end=${endDate}`,
        headers: {
          // User-Agent is needed
          'User-Agent': USER_AGENT
        }
      },
      (err, response, body) => {
        if (err || response.statusCode !== 200) {
          console.log('Error getting training sessions');
          return reject(err);
        }

        const sessions = JSON.parse(body).filter(
          // Only return calendar events that has occured (type = EXERCISE)
          // and no training target events (type = TRAININGTARGET) for example
          event => event.type === 'EXERCISE'
        );

        console.log('Successfully fetched training sessions list');
        console.log(`Total number of sessions: ${sessions.length}`);
        resolve(sessions);
      }
    );
  });

  return promise;
};

const createSessionsDirectory = directoryName => {
  console.log(`Ensuring ${directoryName} directory is created`);

  const promise = new Promise((resolve, reject) => {
    fs.mkdir(directoryName, function(err) {
      if (err) {
        if (err.code === 'EEXIST') {
          console.log(`${directoryName} directory already exists`);
          return resolve();
        }

        console.log(`Error creating ${directoryName} directory`);
        return reject(err);
      }

      console.log(`${directoryName} directory created`);
      resolve();
    });
  });

  return promise;
};

const exportTrainingSession = (sessionId, directoryName, format) => {
  const url = `https://flow.polar.com/api/export/training/${format}/${sessionId}`;
  const fileName = `polar-session-${sessionId}.${format}`;

  const promise = new Promise((resolve, reject) => {
    request
      .get({
        url: url,
        headers: {
          // User-Agent is needed
          'User-Agent': USER_AGENT
        }
      })
      .on('error', err => {
        console.log(`Error downloading sesssion ${sessionId}`);
        reject(err);
      })
      .on('end', err => {
        if (err) {
          console.log(`Error downloading sesssion ${sessionId}`);
          return reject(err);
        }

        resolve();
      })
      .pipe(fs.createWriteStream(`${directoryName}/${fileName}`));
  });

  return promise;
};

const checkFormat = format => {
  const acceptedFormats = ['tcx', 'csv', 'gpx'];
  const defaultFormat = 'tcx';

  if (format === undefined) {
    return defaultFormat;
  } else if (acceptedFormats.indexOf(format) === -1) {
    throw new Error(
      `Only ${acceptedFormats.join(', ')} files format are accepted.`
    );
  }

  return format;
};

const checkStartDate = date => {
  if (date === undefined) {
    return '1.7.2017';
  } else if (!isDateFormatOk(date)) {
    throw new Error(
      'Start date must be in the DD.MM.YYYY format, for example 23.09.2016'
    );
  }

  return date;
};

const checkEndDate = date => {
  if (date === undefined) {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    return `${day}.${month}.${year}`;
  } else if (!isDateFormatOk(date)) {
    throw new Error(
      'End date must be in the DD.MM.YYYY format, for example 23.09.2016'
    );
  }

  return date;
};

const isDateFormatOk = date => {
  const dateRegex = /^(0?[1-9]|[12][0-9]|3[01])[.](0?[1-9]|1[012])[.](19|20)?[0-9]{2}$/;

  return dateRegex.test(date);
};

const exportPolarSessions = (email, password, startDate, endDate, format) => {
  format = checkFormat(format);
  startDate = checkStartDate(startDate);
  endDate = checkEndDate(endDate);

  console.log(
    `Exporting Polar sessions for ${email} between ${startDate} and ${endDate} in ${format} file format.`
  );

  const directoryName = `sessions_${format}`;

  login(email, password)
    .then(() => {
      return Promise.all([
        getTrainingSessionsList(startDate, endDate),
        createSessionsDirectory(directoryName)
      ]);
    })
    .then(results => {
      const sessions = results[0];
      const promises = sessions.map(session =>
        exportTrainingSession(session.listItemId, directoryName, format)
      );

      console.log('Downloading every session');
      return Promise.all(promises);
    })
    .then(() => {
      console.log(`All sessions downloaded in ${directoryName} directory`);
      console.log('Export complete!');
    })
    .catch(err => {
      console.log(err);
    });
};

exportPolarSessions(
  argv.email,
  argv.password,
  argv.start,
  argv.end,
  argv.format
);
