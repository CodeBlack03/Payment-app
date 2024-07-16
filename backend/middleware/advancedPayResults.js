// const mongoose = require('mongoose');

// const advancedPayResults = (Model, populate) => async (req, res, next) => {
//   const excludeQuery = ["select", "sort", "page", "limit", "startDate", "endDate"];
//   let reqQuery = { ...req.query };
//   excludeQuery.forEach((q) => delete reqQuery[q]);
//   // console.log("__________")
//   // console.log(req.query)
//   let queryStr = JSON.stringify(reqQuery);
//   queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);
//   queryStr = JSON.parse(queryStr);

//   // Date filtering
//   const dateConditions = [];
//   // console.log(req.query.startDate)
//   // console.log(req.query.endDate)
//   if (req.query.startDate && req.query.startDate !== "") {
//     const startDate = new Date(req.query.startDate);
//     startDate.setDate(startDate.getDate() - 1); // Subtract one day
//     dateConditions.push({ $gte: ["$date", new Date(startDate)] });
//   }
//   if (req.query.endDate && req.query.endDate !== "") {
//     const endDate = new Date(req.query.endDate);
//     endDate.setUTCHours(23, 59, 59, 999); // Set time to the end of the day
//     dateConditions.push({ $lte: ["$date", new Date(endDate)] });
//   }

//   const filters = {};
//   if (req.query.category && req.query.category !== "") {
//     filters.category = { $regex: req.query.category, $options: "i" }; // Case insensitive
//   }
//   if (req.query.status && req.query.status !== "") {
//     filters.status = { $regex: req.query.status, $options: "i" }; // Case insensitive
//   }

//   // Aggregation pipeline
//   let pipeline = [
//     {
//       $match: {
//         "user": new mongoose.Types.ObjectId(req.user.id) // Match user ID
//       }
//     },
//     {
//       $lookup: {
//         from: 'users',
//         localField: 'user',
//         foreignField: '_id',
//         as: 'user'
//       }
//     },
//     {
//       $unwind: '$user'
//     },
//     {
//       $match: {
//         ...filters,
//       }
//     },
//   ];
//   //console.log(pipeline)
//   // Pagination
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 4;
//   const skip = (page - 1) * limit;

//   pipeline.push({ $skip: skip });
//   pipeline.push({ $limit: limit });

//   // Sort
//   // if (req.query.sort && req.query.sort !== "") {
//   //   const sortBy = req.query.sort.split(",").join(" ");
//   //   pipeline.push({ $sort: { [sortBy]: 1 } });
//   // } else {
//   //   pipeline.push({ $sort: { date: -1 } });
//   // }
// const sortObj = {};
//   if (req.query.sort && req.query.sort !== "") {
//     const sortFields = req.query.sort.split(",");
//     sortFields.forEach(field => {
//       let sortOrder = 1; // Default to ascending order
//       if (field.startsWith('-')) {
//         field = field.substring(1); // Remove the '-' sign
//         sortOrder = -1; // Set to descending order
//       }
//       sortObj[field.trim()] = sortOrder;
//     });
//     pipeline.push({ $sort: sortObj });
//   } else {
//     pipeline.push({ $sort: { date: -1 } }); // Default sorting by date descending
//   }
//   // Execute aggregation
//   const result = await Model.aggregate(pipeline);

//   // Count total documents
//   const totalDocuments = await Model.countDocuments({ user: new mongoose.Types.ObjectId(req.user.id) });

//   // Pagination details
//   const pagination = {
//     page,
//     pages: Math.ceil(totalDocuments / limit) || 1,
//   };

//   // Prepare response
//   res.advancedResults = {
//     success: true,
//     count: result.length,
//     pagination,
//     data: result,
//   };

//   next();
// };

// module.exports = advancedPayResults;
const mongoose = require('mongoose');

const advancedPayResults = (Model, populate) => async (req, res, next) => {
  const excludeQuery = ["select", "sort", "page", "limit", "startDate", "endDate"];
  let reqQuery = { ...req.query };
  excludeQuery.forEach((q) => delete reqQuery[q]);

  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);
  queryStr = JSON.parse(queryStr);

  // Date filtering
  const dateConditions = [];
  if (req.query.startDate && req.query.startDate !== "") {
    const startDate = new Date(req.query.startDate);
    startDate.setUTCHours(0, 0, 0, 0); // Subtract one day
    console.log("Start Date:",startDate)
    dateConditions.push({ $gte: ["$date", new Date(startDate)] });
  }
  if (req.query.endDate && req.query.endDate !== "") {
    const endDate = new Date(req.query.endDate);
    endDate.setUTCHours(23, 59, 59, 999); // Set time to the end of the day
    console.log("End Date:",endDate)
    dateConditions.push({ $lte: ["$date", new Date(endDate)] });
  }
  const filters = {};
  if (req.query.category && req.query.category !== "") {
    filters.category = { $regex: req.query.category, $options: "i" }; // Case insensitive
  }
  if (req.query.status && req.query.status !== "") {
    filters.status = { $regex: req.query.status, $options: "i" }; // Case insensitive
  }

  // Aggregation pipeline
  let pipeline = [
    {
      $match: {
        "user": new mongoose.Types.ObjectId(req.user.id) // Match user ID
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $match: {
        ...filters,

      }
    },
  ];
  if (dateConditions.length > 0) {
    pipeline.push({
      $match: {
        $expr: {
          $and: dateConditions
        }
      }
    });
  }

  // Sort
  const sortObj = {};
  if (req.query.sort && req.query.sort !== "") {
    const sortFields = req.query.sort.split(",");
    sortFields.forEach(field => {
      let sortOrder = 1; // Default to ascending order
      if (field.startsWith('-')) {
        field = field.substring(1); // Remove the '-' sign
        sortOrder = -1; // Set to descending order
      }
      sortObj[field.trim()] = sortOrder;
    });
    pipeline.push({ $sort: sortObj });
  } else {
    pipeline.push({ $sort: { date: -1 } }); // Default sorting by date descending
  }
   const temp = await Model.aggregate(pipeline);

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const skip = (page - 1) * limit;

  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  // Execute aggregation
  const result = await Model.aggregate(pipeline);

  // Count total documents
  const totalDocuments = temp.length;

  // Pagination details
  const pagination = {
    page,
    pages: Math.ceil(totalDocuments / limit) || 1,
  };

  // Prepare response
  res.advancedResults = {
    success: true,
    count: result.length,
    pagination,
    data: result,
  };

  next();
};

module.exports = advancedPayResults;
