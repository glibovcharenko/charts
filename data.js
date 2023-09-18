// Define DOM elements
const studentName = document.getElementById('student-name');
const studentGitea = document.getElementById('student-gitea');
const studentEmail = document.getElementById('student-email');
const studentXpAmount = document.getElementById('student-xp-amount');
const studentAuditRatio = document.getElementById('student-audit-ratio');
const audits = document.getElementById('audits');
const progress = document.getElementById('progress');
const skills = document.getElementById('skills');

// Fetch user data from GraphQL API and populate UI
async function fetchAndPopulateData() {
  const token = localStorage.getItem('token');
  if (!token) {
    location.replace('/charts/index.html');
    return;
  }

  try {
    // attachLogoutListener();
    const data = await getData(token);
    console.log('Fetched data:', data);

    if (data && data.user && data.user.length > 0) {
      const userInfo = data.user[0];
      populateUserInfo(userInfo);
      buildCharts(userInfo);
      attachLogoutListener();
    } else {
      console.error('No user data found in response.');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}


// Populate user information in UI
function populateUserInfo(userInfo) {
  studentName.innerText = `${userInfo.attrs.firstName} ${userInfo.attrs.lastName}`;
  studentGitea.action = `https://01.kood.tech/git/${userInfo.login}`;
  studentEmail.innerText = userInfo.attrs.email;
  studentAuditRatio.innerText = `Your audit ratio: ${calculateAuditRatio(userInfo.totalUp, userInfo.totalDown)}`;
  console.log(userInfo)
  const xpTotal = calculateTotalXP(userInfo.transactions);
  studentXpAmount.innerText = `Your XP amount: ${xpTotal.amount} ${xpTotal.size}`;
}

// Calculate audit ratio
function calculateAuditRatio(totalUp, totalDown) {
  return Math.round((totalUp / totalDown) * 10) / 10;
}

// Calculate total XP
function calculateTotalXP(transactions) {
  const xpTransactions = transactions.filter(task =>
    task.type === 'xp' &&
    /^\/johvi\/div-01(?!\/piscine-js)/.test(task.path)
  );

  console.log(xpTransactions)
  const totalXP = xpTransactions.reduce((total, task) => total + task.amount, 0);
  return convertBytesToSize(totalXP);
}

// Build charts
function buildCharts(userInfo) {
  makeAuditsChart(userInfo.totalUp, userInfo.totalDown);
  const regexPath = /^\/johvi\/div-01\/(?!.*piscine).*$/
  const regexTypeXp = /xp/gm
  const regexTypeSkill = /^skill_.+/gm
  const xpData = userInfo.transactions.filter((task) => regexPath.test(task.path) && regexTypeXp.test(task.type)).map((task) => {
    return {
      name: task.path.split('/')[3],
      data: task.amount,
      date: new Date(task.createdAt).toLocaleDateString('en-GB')
    }
  })

  makeXpChart(xpData);

  let xp = convertBytesToSize(xpData.reduce((sum, task) => sum + task.data, 0))
  studentXpAmount.innerText = `Your XP amount: ${xp.amount} ${xp.size}`

  const skillsData = userInfo.transactions.filter((task) => regexPath.test(task.path) && regexTypeSkill.test(task.type)).map((task) => {
    return {
      skill: task.type.split('_')[1],
      data: task.amount
    }
  })
  makeSkillsChart(skillsData)
}

// Attach logout listener
function attachLogoutListener() {
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    location.replace('/charts/index.html');
  });
}

// Fetch user data from GraphQL API
async function getData(token) {
  const query = `
      query {
          user {
              id
              login
              attrs
              totalUp
              totalDown
              transactions(order_by: { createdAt: asc }) {
                  id
                  type
                  amount
                  path
                  createdAt
              }
          }
      }
  `;

  try {
    const response = await fetch('https://01.kood.tech/api/graphql-engine/v1/graphql', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    console.log('GraphQL response:', result);

    return result.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}


// Convert bytes to size
function convertBytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1000));
  const convertedValue = parseFloat((bytes / Math.pow(1000, i)).toFixed(2));

  return {
    amount: convertedValue,
    size: sizes[i]
  };
}


// Function to convert bytes to kilobytes
function convertBytesToKB(bytes) {
  return {
      amount: Math.round(bytes*100/1000)/100,
      size: "kB"
  }
}

function makeXpChart(tasks) {
  const amountArray = tasks.map((task) => {
      return convertBytesToKB(task.data)
  })

  amountArray.sort((a, b) => a.amount - b.amount);

  const categories = tasks.map((task) => task.name)

  var options = {
      series: [{
          name: 'XP',
          data: amountArray.map((el) => el.amount)
      }],
      chart: {
          height: 800,
          type: 'bar',
      },
      plotOptions: {
          bar: {
              borderRadius: 4,
              horizontal: true,
              dataLabels: {
                  position: 'top',
              },
          }
      },
      dataLabels: {
          enabled: true,
          formatter: function (val) {
              return val + ' kB';
          },
          offsetY: 0,
          style: {
              fontSize: '10px',
              colors: ["#304758"]
              
          }
      },
      theme: {
          palette: 'palette3'
      },
      xaxis: {
          categories: categories,
          position: 'bottom',
          axisTicks: {
              show: false
          }
      },
      title: {
          text: 'XP earned by task',
          
      }
  }

  var chart = new ApexCharts(progress, options);
  chart.render();
}

// Function to create the Skills chart
function makeSkillsChart(tasks) {
  const treemapData = tasks.reduce((accumulator, task) => {
    if (accumulator.hasOwnProperty(task.skill)) {
      accumulator[task.skill] += task.data
    } else {
      accumulator[task.skill] = task.data
    }
    return accumulator
  }, {})

  const result = Object.keys(treemapData).map(skill => {
    return {
      x: skill,
      y: treemapData[skill]
    }
  })

  var options = {
    chart : {
        height: 450,
        width: 450,
        foreColor: '#333',
        type: 'radar'
    },
    series: [{
        name: 'Skills',
        data: result
    }],
    legend: {
        show: true
    },
    title: {
        text: 'Your skills'
    },
  };

  const chart = new ApexCharts(skills, options);
  chart.render();
}

// Function to create the Audits chart
function makeAuditsChart(up, down) {
  const chartData = [
    { label: 'Given', value: up },
    { label: 'Received', value: down }
  ];

  const options = {
    chart: {
      width: 540,
      type: 'pie',
    },
    labels: ['given', 'received'],
    theme: {
      monochrome: {
        enabled: true,
        color: '#166fe5',
        shadeTo: 'light',
        shadeIntensity: 0.65
      }
    },
    plotOptions: {
      pie: {
        dataLabels: {
          offset: -15
        }
      }
    },
    title: {
      text: "Your audits rating"
    },
    dataLabels: {
      formatter(val, opts) {
        const name = opts.w.globals.labels[opts.seriesIndex]
        return [name, val.toFixed(1) + '%']
      }
    },
    legend: {
      show: false
    },
    series: [up, down]
  };

  const chart = new ApexCharts(audits, options);
  chart.render();
}

// Entry point
fetchAndPopulateData();
