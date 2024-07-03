const advancedResults = (Model, populate) =>
  async (req, res, next) => {
    const excludeQuery = ["select", "sort", "page", "limit", "startDate", "endDate"];
    
    let reqQuery = { ...req.query };
    excludeQuery.forEach((q) => {
      delete reqQuery[q];
    });

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    queryStr = JSON.parse(queryStr);

    // Handling keyword search
    const keyword = req.query.keyword
      ? {
          name: {
            $regex: req.query.keyword,
            $options: "i",
          },
        }
      : {};

    // Date filtering
    if (req.query.startDate || req.query.endDate) {
      const dateFilter = {};
      if (req.query.startDate) {
        dateFilter.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        dateFilter.$lte = new Date(req.query.endDate);
      }
      queryStr.createdAt = dateFilter;
    }

    // Specific field filtering
    const filters = {};
    if (req.query.houseNumber) {
      filters.houseNumber = req.query.houseNumber;
    }
    if (req.query.houseType) {
      filters.houseType = req.query.houseType;
    }
    if (req.query.category) {
      filters.category = req.query.category;
    }

    let query = Model.find({ ...keyword, ...queryStr, ...filters });

    const pagination = {};
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;

    const totalDocuments = await Model.countDocuments({ ...keyword, ...queryStr, ...filters });
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
    query.skip((page - 1) * limit).limit(limit);
    query.select(req.query.select);
    
    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query.sort(sortBy);
    } else {
      query.sort("-createdAt");
    }

    if (populate) {
      query = query.populate(populate);
    }

    const result = await query;

    result.map((r) => {
      if (r.password) {
        r.password = undefined;
      }
    });

    res.advancedResults = {
      success: true,
      count: result.length,
      pagination: {
        page,
        pages: Math.ceil(totalDocuments / limit),
      },
      data: result,
    };
    next();
  };

module.exports = advancedResults;
