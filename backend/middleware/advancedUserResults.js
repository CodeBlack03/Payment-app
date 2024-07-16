const advancedUserResults = (Model, populate, id) => async (req, res, next) => {
  const excludeQuery = ["select", "sort", "page", "limit", "startDate", "endDate"];
  let reqQuery = { ...req.query };
  excludeQuery.forEach((q) => {
    delete reqQuery[q];
  });

  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);
  queryStr = JSON.parse(queryStr);

  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: "i",
        },
      }
    : {};

  // if (req.query.startDate || req.query.endDate) {
  //   const dateFilter = {};
  //   if (req.query.startDate) {
  //     dateFilter.$gte = new Date(req.query.startDate);
  //   }
  //   if (req.query.endDate) {
  //     dateFilter.$lte = new Date(req.query.endDate);
  //   }
  //   queryStr.createdAt = dateFilter;
  // }
    //console.log(req.query)
  const filters = {};
  if (req.query.category && req.query.category !== "") {
    filters.category = { $regex: req.query.category, $options: "i" };
  }

  // Aggregation pipeline
  let pipeline = [
    {
      $match: {
        ...filters,
        ...(req.query.keyword ? { "name": { $regex: req.query.keyword, $options: "i" } } : {}),
        ...(req.query.houseType ? { "houseType": req.query.houseType } : {}),
        ...(req.query.status ? { "status": req.query.status } : {})
      }
    },
  ];

  //console.log(pipeline)

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
  //console.log("SORT BY: ",req.query.sort)
   
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

  // query.skip((page - 1) * limit).limit(limit);
  // query.select(req.query.select);

  // if (req.query.sort) {
  //   const sortBy = req.query.sort.split(",").join(" ");
  //   query.sort(sortBy);
  // } else {
  //   query.sort("-createdAt");
  // }

  

  // const result = await query;

  res.advancedUserResults = {
    success: true,
    count: result.length,
    pagination: {
      page,
      pages: Math.ceil(totalDocuments / limit) > 0 ? Math.ceil(totalDocuments / limit) : 1,
    },
    data: result,
  };
  //console.log(result)
  next();
};

module.exports = advancedUserResults;
