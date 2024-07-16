const advancedResults = (Model,  id) => async (req, res, next) => {
  const excludeQuery = ["select", "sort", "page", "limit", "startDate", "endDate"];
  let reqQuery = { ...req.query };
  excludeQuery.forEach((q) => delete reqQuery[q]);

  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);
  queryStr = JSON.parse(queryStr);

  // Date filtering
  const dateConditions = [];
  if (req.query.startDate && req.query.startDate !== "") {
    // Adjust startDate by subtracting 1 millisecond to include the full day
    const startDate = new Date(req.query.startDate);
    startDate.setDate(startDate.getDate() - 1); // Subtract one day
    dateConditions.push({ $gte: ["$date", new Date(startDate)] });
  }
  if (req.query.endDate && req.query.endDate !== "") {
    const endDate = new Date(req.query.endDate);
    endDate.setUTCHours(23, 59, 59, 999); // Set time to the end of the day
    dateConditions.push({ $lte: ["$date", new Date(endDate)] });
  }

  // Aggregation pipeline
  let pipeline = [
    
    {
      $match: {
        ...(req.query.category ? { "category": { $regex: req.query.category, $options: "i" } } : {}),
        ...(req.query.keyword ? { "category": { $regex: req.query.keyword, $options: "i" } } : {}),
        
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
  console.log(pipeline)
  console.log(req.query)
  if (id) {
    pipeline.unshift({ $match: { _id: id } });
  }

  const temp = await Model.aggregate(pipeline);
  const totalDocuments = temp.length;
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
  // Pagination
  const pagination = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const skip = (page - 1) * limit;

  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });



  // Execute aggregation
  const result = await Model.aggregate(pipeline);

  const firstPage = (page - 1) * limit;
  const lastPage = page * limit;

  if (firstPage > 0) {
    pagination.pre = {
      page: page - 1,
      limit,
    };
  }
  if (lastPage < totalDocuments) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  res.advancedResults = {
    success: true,
    count: result.length,
    pagination: {
      page,
      pages: Math.ceil(totalDocuments / limit) > 0 ? Math.ceil(totalDocuments / limit) : 1,
    },
    data: result,
  };
  next();
};

module.exports = advancedResults;
